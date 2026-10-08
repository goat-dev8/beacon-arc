// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IBeaconReceiptRegistry {
    function record(
        bytes32 actionHash,
        address vault,
        address agent,
        address recipient,
        uint256 amount,
        uint256 nonce
    ) external;
}

/// @notice USDC firewall. The executor relays an agent EIP-712 signature.
///         The vault builds the transfer. The executor cannot choose calldata.
contract BeaconUsdcVault {
    uint8 public constant CLASS_SEND = 1;

    bytes32 public constant ACTION_TYPEHASH = keccak256(
        "Action(uint256 grantId,address agent,uint8 actionClass,address token,address recipient,uint256 amount,address tokenOut,uint256 amountOutMin,bytes32 quoteHash,uint256 nonce,uint256 deadline,uint256 policyVersion)"
    );

    struct Action {
        uint256 grantId;
        address agent;
        uint8 actionClass;
        address token;
        address recipient;
        uint256 amount;
        address tokenOut;
        uint256 amountOutMin;
        bytes32 quoteHash;
        uint256 nonce;
        uint256 deadline;
        uint256 policyVersion;
    }

    struct Grant {
        address agent;
        uint256 maxPerTx;
        uint64 expiry;
        uint8 scopes;
        bool active;
    }

    address public owner;
    address public executor;
    address public immutable usdc;
    IBeaconReceiptRegistry public immutable registry;

    bool public paused;
    uint256 public maxPerTx;
    uint256 public windowLimit;
    uint256 public windowSeconds;
    uint256 public windowStart;
    uint256 public windowSpent;
    uint256 public policyVersion;
    uint256 public nonce;

    mapping(address => bool) public allowedRecipient;
    mapping(address => bool) public blockedRecipient;
    mapping(uint256 => Grant) public grants;
    mapping(bytes32 => bool) public usedAction;

    bytes32 private immutable _domainSeparator;

    event PolicySet(uint256 maxPerTx, uint256 windowLimit, uint256 windowSeconds, uint256 policyVersion);
    event Paused(bool paused);
    event ExecutorSet(address executor);
    event RecipientAllowed(address recipient, bool allowed);
    event RecipientBlocked(address recipient, bool blocked);
    event GrantSet(uint256 grantId, address agent, uint256 maxPerTx, uint64 expiry, uint8 scopes);
    event GrantRevoked(uint256 grantId);
    event Withdrawn(address to, uint256 amount);
    event Executed(bytes32 actionHash, address agent, address recipient, uint256 amount, uint256 nonce);

    error NotOwner();
    error NotExecutor();
    error PausedVault();
    error BadSignature();
    error GrantInactive();
    error GrantExpired();
    error ScopeDenied();
    error RecipientDenied();
    error OverCap();
    error OverWindow();
    error BadNonce();
    error Expired();
    error PolicyMismatch();
    error TokenMismatch();
    error Replay();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address usdc_, address owner_, address executor_, address registry_) {
        if (usdc_ == address(0) || owner_ == address(0) || executor_ == address(0) || registry_ == address(0)) {
            revert ZeroAddress();
        }
        usdc = usdc_;
        owner = owner_;
        executor = executor_;
        registry = IBeaconReceiptRegistry(registry_);
        _domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("Beacon"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator;
    }

    function setPolicy(uint256 maxPerTx_, uint256 windowLimit_, uint256 windowSeconds_) external onlyOwner {
        if (windowLimit_ < maxPerTx_) revert OverCap();
        maxPerTx = maxPerTx_;
        windowLimit = windowLimit_;
        windowSeconds = windowSeconds_;
        policyVersion += 1;
        emit PolicySet(maxPerTx_, windowLimit_, windowSeconds_, policyVersion);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit Paused(paused_);
    }

    function setExecutor(address executor_) external onlyOwner {
        if (executor_ == address(0)) revert ZeroAddress();
        executor = executor_;
        emit ExecutorSet(executor_);
    }

    function allowRecipient(address recipient, bool allowed) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        allowedRecipient[recipient] = allowed;
        emit RecipientAllowed(recipient, allowed);
    }

    function blockRecipient(address recipient, bool blocked) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        blockedRecipient[recipient] = blocked;
        emit RecipientBlocked(recipient, blocked);
    }

    function setGrant(uint256 grantId, address agent, uint256 grantMax, uint64 expiry, uint8 scopes) external onlyOwner {
        if (agent == address(0) || grantId == 0) revert ZeroAddress();
        grants[grantId] = Grant({agent: agent, maxPerTx: grantMax, expiry: expiry, scopes: scopes, active: true});
        emit GrantSet(grantId, agent, grantMax, expiry, scopes);
    }

    function revokeGrant(uint256 grantId) external onlyOwner {
        grants[grantId].active = false;
        emit GrantRevoked(grantId);
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        _transfer(to, amount);
        emit Withdrawn(to, amount);
    }

    function hashAction(Action calldata action) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                ACTION_TYPEHASH,
                action.grantId,
                action.agent,
                action.actionClass,
                action.token,
                action.recipient,
                action.amount,
                action.tokenOut,
                action.amountOutMin,
                action.quoteHash,
                action.nonce,
                action.deadline,
                action.policyVersion
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator, structHash));
    }

    function executeSend(Action calldata action, bytes calldata signature) external {
        if (msg.sender != executor) revert NotExecutor();
        if (paused) revert PausedVault();
        if (action.actionClass != CLASS_SEND) revert ScopeDenied();
        if (action.token != usdc || action.tokenOut != address(0)) revert TokenMismatch();
        if (block.timestamp > action.deadline) revert Expired();
        if (action.policyVersion != policyVersion) revert PolicyMismatch();
        if (action.nonce != nonce) revert BadNonce();

        bytes32 actionHash = hashAction(action);
        if (usedAction[actionHash]) revert Replay();

        address signer = _recover(actionHash, signature);
        if (signer == address(0) || signer != action.agent) revert BadSignature();

        Grant memory grant = grants[action.grantId];
        if (!grant.active || grant.agent != signer) revert GrantInactive();
        if (block.timestamp > grant.expiry) revert GrantExpired();
        if ((grant.scopes & 1) == 0) revert ScopeDenied();
        if (!allowedRecipient[action.recipient] || blockedRecipient[action.recipient]) revert RecipientDenied();
        if (action.amount > maxPerTx || action.amount > grant.maxPerTx || action.amount == 0) revert OverCap();

        _chargeWindow(action.amount);

        nonce = action.nonce + 1;
        usedAction[actionHash] = true;
        _transfer(action.recipient, action.amount);
        registry.record(actionHash, address(this), signer, action.recipient, action.amount, action.nonce);
        emit Executed(actionHash, signer, action.recipient, action.amount, action.nonce);
    }

    function _chargeWindow(uint256 amount) internal {
        if (windowSeconds == 0) {
            if (amount > windowLimit) revert OverWindow();
            return;
        }
        if (block.timestamp >= windowStart + windowSeconds) {
            windowStart = block.timestamp;
            windowSpent = 0;
        }
        if (windowSpent + amount > windowLimit) revert OverWindow();
        windowSpent += amount;
    }

    function _transfer(address to, uint256 amount) internal {
        (bool ok, bytes memory data) = usdc.call(abi.encodeWithSelector(IERC20.transfer.selector, to, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) return address(0);
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return address(0);
        return ecrecover(digest, v, r, s);
    }
}
