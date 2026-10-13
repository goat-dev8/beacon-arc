// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
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

/// @notice Uniswap V3 SwapRouter02 (pinned). Only `exactInputSingle` is used.
/// @dev Full router interface is intentionally NOT imported: the vault must
///      never be able to call multicall, exactInput, or any other entrypoint.
interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/// @notice Circle CCTP V2 TokenMessenger (pinned). Only `depositForBurn` is used.
/// @dev This is the V2 7-parameter variant:
///      depositForBurn(amount, destinationDomain, mintRecipient, burnToken,
///                     destinationCaller, maxFee, minFinalityThreshold).
///      The vault hardcodes destinationCaller=0 (permissionless mint),
///      maxFee=0 (standard transfer, no fast fee), minFinalityThreshold=1000
///      (standard finality). `depositForBurnWithHook` is intentionally NOT
///      exposed: no hook calldata may ever be supplied by anyone but the vault
///      itself (and it supplies none).
interface ITokenMessengerV2 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external returns (uint64 nonce);
}

/// @title BeaconUsdcVaultV2 — the firewall that can now also quote-swap and bridge.
/// @notice V1 (send-only) stays live and untouched. V2 is a NEW vault: every USDC
///         movement is still an agent-signed, policy-checked, allowlist-bound action
///         relayed by an executor that cannot alter ANY field. New in V2:
///         - CLASS_SWAP (2): vault-executed Uniswap V3 exactInputSingle on the ONE
///           pinned USDC/EURC 0.05% pool. Output always returns to the vault.
///         - CLASS_BRIDGE (3): vault-executed CCTP V2 depositForBurn to an allowlisted
///           domain and an allowlisted mint recipient.
/// @dev Security model (unchanged from V1, extended):
///      - The executor is msg.sender-checked and supplies NOTHING but the agent's
///        signature. All call parameters come from the signed Action struct, which the
///        vault itself translates into external calls it builds.
///      - External call targets are constants pinned at deploy time. There is no
///        arbitrary-call, no delegatecall, no multicall, no hook data.
///      - Reentrancy guard on all three execute functions (V1 had none; the new
///        external calls to router/messenger make it non-negotiable).
///      - Slippage protection for swaps is the SIGNED amountOutMin: the agent commits
///        to a quote off-chain (quoteHash binds it for audit); on-chain the router
///        reverts unless the vault receives >= amountOutMin. A stale or malicious
///        quote cannot steal funds — it can only revert.
///      - Owner powers are identical to V1 plus two scoped setters
///        (setTokenOutAllowed, setDomainAllowed). The owner can still drain via
///        withdraw() — same trust model as V1, documented not hidden.
contract BeaconUsdcVaultV2 {
    uint8 public constant CLASS_SEND = 1;
    uint8 public constant CLASS_SWAP = 2;
    uint8 public constant CLASS_BRIDGE = 3;

    /// @notice Grant scope bits: 1 = send, 2 = swap, 4 = bridge.
    uint8 public constant SCOPE_SEND = 1;
    uint8 public constant SCOPE_SWAP = 2;
    uint8 public constant SCOPE_BRIDGE = 4;

    // ---- Pinned Arc mainnet addresses (verified on-chain, see evidence) ----
    /// @notice Uniswap V3 SwapRouter02 on Arc (verified, 21902-code family).
    address public constant SWAP_ROUTER = 0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77;
    /// @notice EURC on Arc.
    address public constant EURC = 0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1;
    /// @notice The ONE pool the vault may trade on: USDC/EURC 0.05%.
    address public constant USDC_EURC_POOL = 0x6fd5F2fb831940DcD61A98c5B3aCB7D8C6f3bFc1;
    /// @notice Fee tier of the pinned pool.
    uint24 public constant SWAP_FEE = 500;
    /// @notice Circle CCTP V2 TokenMessenger on Arc (localDomain 26).
    address public constant TOKEN_MESSENGER = 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d;

    /// @notice EIP-712 Action. V1 had 12 fields; V2 appends uint32 destDomain
    ///         (0 for send/swap; enforced). The domain separator binds
    ///         verifyingContract = this vault, so V1 signatures can never replay here.
    bytes32 public constant ACTION_TYPEHASH = keccak256(
        "Action(uint256 grantId,address agent,uint8 actionClass,address token,address recipient,uint256 amount,address tokenOut,uint256 amountOutMin,bytes32 quoteHash,uint32 destDomain,uint256 nonce,uint256 deadline,uint256 policyVersion)"
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
        uint32 destDomain;
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
    /// @notice tokenOut allowlist for swaps. EURC enabled at deploy.
    mapping(address => bool) public allowedTokenOut;
    /// @notice CCTP destination-domain allowlist. Base (6) enabled at deploy.
    mapping(uint32 => bool) public allowedDomain;
    mapping(uint256 => Grant) public grants;
    mapping(bytes32 => bool) public usedAction;

    bytes32 private immutable _domainSeparator;
    bool private _locked;

    event PolicySet(uint256 maxPerTx, uint256 windowLimit, uint256 windowSeconds, uint256 policyVersion);
    event Paused(bool paused);
    event ExecutorSet(address executor);
    event RecipientAllowed(address recipient, bool allowed);
    event RecipientBlocked(address recipient, bool blocked);
    event TokenOutAllowed(address tokenOut, bool allowed);
    event DomainAllowed(uint32 domain, bool allowed);
    event GrantSet(uint256 grantId, address agent, uint256 maxPerTx, uint64 expiry, uint8 scopes);
    event GrantRevoked(uint256 grantId);
    event Withdrawn(address to, uint256 amount);
    event Executed(bytes32 actionHash, address agent, address recipient, uint256 amount, uint256 nonce);
    event Swapped(bytes32 actionHash, address agent, uint256 amountIn, uint256 amountOut, uint256 nonce);
    event Bridged(
        bytes32 actionHash,
        address agent,
        address mintRecipient,
        uint256 amount,
        uint32 destDomain,
        uint64 messengerNonce,
        uint256 nonce
    );

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
    error TokenOutDenied();
    error DomainDenied();
    error BadDestDomain();
    error Replay();
    error TransferFailed();
    error ApproveFailed();
    error SwapFailed();
    error BridgeFailed();
    error Reentrant();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_locked) revert Reentrant();
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address usdc_, address owner_, address executor_, address registry_) {
        if (usdc_ == address(0) || owner_ == address(0) || executor_ == address(0) || registry_ == address(0)) {
            revert ZeroAddress();
        }
        usdc = usdc_;
        owner = owner_;
        executor = executor_;
        registry = IBeaconReceiptRegistry(registry_);
        // Initial allowlists: the two rails V2 ships with. The owner can extend.
        allowedTokenOut[EURC] = true;
        allowedDomain[6] = true; // Base
        _domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("Beacon"),
                keccak256("2"),
                block.chainid,
                address(this)
            )
        );
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparator;
    }

    // ---- Owner administration (same as V1, plus two scoped setters) ----

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

    /// @notice Extend (or revoke) the swap tokenOut allowlist. Starts with EURC only.
    function setTokenOutAllowed(address tokenOut, bool allowed) external onlyOwner {
        if (tokenOut == address(0)) revert ZeroAddress();
        allowedTokenOut[tokenOut] = allowed;
        emit TokenOutAllowed(tokenOut, allowed);
    }

    /// @notice Extend (or revoke) the CCTP destination-domain allowlist. Starts with Base (6) only.
    function setDomainAllowed(uint32 domain, bool allowed) external onlyOwner {
        allowedDomain[domain] = allowed;
        emit DomainAllowed(domain, allowed);
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

    // ---- EIP-712 ----

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
                action.destDomain,
                action.nonce,
                action.deadline,
                action.policyVersion
            )
        );
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator, structHash));
    }

    // ---- Execution ----

    /// @notice V1 send path, preserved. Scope bit 1.
    function executeSend(Action calldata action, bytes calldata signature) external nonReentrant {
        if (msg.sender != executor) revert NotExecutor();
        if (paused) revert PausedVault();
        if (action.actionClass != CLASS_SEND) revert ScopeDenied();
        if (action.token != usdc || action.tokenOut != address(0)) revert TokenMismatch();
        if (action.destDomain != 0) revert BadDestDomain();
        _checkActionTiming(action);

        bytes32 actionHash = hashAction(action);
        if (usedAction[actionHash]) revert Replay();

        address signer = _recoverAndCheckGrant(action, actionHash, signature, SCOPE_SEND);
        if (!allowedRecipient[action.recipient] || blockedRecipient[action.recipient]) revert RecipientDenied();
        if (action.amount > maxPerTx || action.amount > grants[action.grantId].maxPerTx || action.amount == 0) {
            revert OverCap();
        }

        _chargeWindow(action.amount);

        nonce = action.nonce + 1;
        usedAction[actionHash] = true;
        _transfer(action.recipient, action.amount);
        registry.record(actionHash, address(this), signer, action.recipient, action.amount, action.nonce);
        emit Executed(actionHash, signer, action.recipient, action.amount, action.nonce);
    }

    /// @notice Agent-signed swap on the ONE pinned pool. Output always returns to
    ///         the vault — the executor cannot redirect it, the agent cannot
    ///         redirect it, the pool cannot be substituted. Scope bit 2.
    /// @dev Slippage: amountOutMinimum comes from the SIGNED quote. The router
    ///      reverts unless the vault receives at least that much tokenOut.
    function executeSwap(Action calldata action, bytes calldata signature) external nonReentrant {
        if (msg.sender != executor) revert NotExecutor();
        if (paused) revert PausedVault();
        if (action.actionClass != CLASS_SWAP) revert ScopeDenied();
        if (action.token != usdc) revert TokenMismatch();
        if (!allowedTokenOut[action.tokenOut]) revert TokenOutDenied();
        // The swap output must land in the vault. Not the executor, not a
        // recipient, not a hook — the vault. This is what makes the swap
        // un-trickable: there is exactly one place value can go.
        if (action.recipient != address(this)) revert RecipientDenied();
        if (action.destDomain != 0) revert BadDestDomain();
        _checkActionTiming(action);

        bytes32 actionHash = hashAction(action);
        if (usedAction[actionHash]) revert Replay();

        address signer = _recoverAndCheckGrant(action, actionHash, signature, SCOPE_SWAP);
        if (action.amount > maxPerTx || action.amount > grants[action.grantId].maxPerTx || action.amount == 0) {
            revert OverCap();
        }

        _chargeWindow(action.amount);

        nonce = action.nonce + 1;
        usedAction[actionHash] = true;

        // Approve exactly amountIn for the pinned router, then let the vault
        // build the swap call itself. No multicall, no alternate entrypoint.
        _approve(usdc, SWAP_ROUTER, action.amount);
        uint256 amountOut;
        try ISwapRouter02(SWAP_ROUTER).exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: usdc,
                tokenOut: action.tokenOut,
                fee: SWAP_FEE,
                recipient: address(this),
                amountIn: action.amount,
                amountOutMinimum: action.amountOutMin,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 out) {
            amountOut = out;
        } catch {
            revert SwapFailed();
        }

        registry.record(actionHash, address(this), signer, address(this), action.amount, action.nonce);
        emit Swapped(actionHash, signer, action.amount, amountOut, action.nonce);
    }

    /// @notice Agent-signed CCTP V2 burn on Arc. The mint recipient is an
    ///         allowlisted EVM address on an allowlisted destination domain.
    ///         Scope bit 4.
    /// @dev The vault approves the pinned TokenMessenger and calls
    ///      depositForBurn itself. depositForBurnWithHook is never reachable.
    function executeBridge(Action calldata action, bytes calldata signature) external nonReentrant {
        if (msg.sender != executor) revert NotExecutor();
        if (paused) revert PausedVault();
        if (action.actionClass != CLASS_BRIDGE) revert ScopeDenied();
        if (action.token != usdc || action.tokenOut != address(0)) revert TokenMismatch();
        if (!allowedDomain[action.destDomain] || action.destDomain == 0) revert DomainDenied();
        _checkActionTiming(action);

        bytes32 actionHash = hashAction(action);
        if (usedAction[actionHash]) revert Replay();

        address signer = _recoverAndCheckGrant(action, actionHash, signature, SCOPE_BRIDGE);
        // The mint recipient lives on another chain but is still allowlist-bound:
        // an agent can only ever bridge to a recipient the owner approved.
        if (!allowedRecipient[action.recipient] || blockedRecipient[action.recipient]) revert RecipientDenied();
        if (action.amount > maxPerTx || action.amount > grants[action.grantId].maxPerTx || action.amount == 0) {
            revert OverCap();
        }

        _chargeWindow(action.amount);

        nonce = action.nonce + 1;
        usedAction[actionHash] = true;

        _approve(usdc, TOKEN_MESSENGER, action.amount);
        uint64 messengerNonce;
        // CCTP V2 7-parameter burn. The vault fixes the last three parameters:
        // destinationCaller=0 (anyone may complete the mint on the destination),
        // maxFee=0 (standard transfer), minFinalityThreshold=1000 (standard).
        // The agent signs amount/destination/recipient; the executor alters nothing.
        try ITokenMessengerV2(TOKEN_MESSENGER).depositForBurn(
            action.amount,
            action.destDomain,
            bytes32(uint256(uint160(action.recipient))),
            usdc,
            bytes32(0),
            0,
            1000
        ) returns (uint64 mNonce) {
            messengerNonce = mNonce;
        } catch {
            revert BridgeFailed();
        }

        registry.record(actionHash, address(this), signer, action.recipient, action.amount, action.nonce);
        emit Bridged(actionHash, signer, action.recipient, action.amount, action.destDomain, messengerNonce, action.nonce);
    }

    // ---- Internals ----

    function _checkActionTiming(Action calldata action) internal view {
        if (block.timestamp > action.deadline) revert Expired();
        if (action.policyVersion != policyVersion) revert PolicyMismatch();
        if (action.nonce != nonce) revert BadNonce();
    }

    /// @notice Shared signature + grant verification. Returns the signer.
    /// @dev Identical checks to V1, parameterized by the required scope bit.
    function _recoverAndCheckGrant(
        Action calldata action,
        bytes32 actionHash,
        bytes calldata signature,
        uint8 scopeBit
    ) internal view returns (address signer) {
        signer = _recover(actionHash, signature);
        if (signer == address(0) || signer != action.agent) revert BadSignature();

        Grant memory grant = grants[action.grantId];
        if (!grant.active || grant.agent != signer) revert GrantInactive();
        if (block.timestamp > grant.expiry) revert GrantExpired();
        if ((grant.scopes & scopeBit) == 0) revert ScopeDenied();
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

    function _approve(address token, address spender, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSelector(IERC20.approve.selector, spender, amount));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert ApproveFailed();
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
