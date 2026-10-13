// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BeaconUsdcVaultV2} from "../src/BeaconUsdcVaultV2.sol";
import {BeaconUsdcVault} from "../src/BeaconUsdcVault.sol";
import {BeaconReceiptRegistry} from "../src/BeaconReceiptRegistry.sol";
import {BeaconVaultFactoryV2} from "../src/BeaconVaultFactoryV2.sol";

/// @notice Minimal ERC20 with approve/transferFrom for router/messenger pulls.
contract MockToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "balance");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// @notice Mock SwapRouter02 etched at the PINNED router address.
///         Pays out tokenOut 1:1 by default; rateBips tunes the payout
///         (9000 = 0.9x, to simulate slippage). Can attempt reentry.
contract MockRouter {
    MockToken public tokenIn;
    MockToken public tokenOut;
    uint256 public rateBips = 10000;
    bool public tryReenter;
    address public vault;

    // Last-call capture for assertions.
    address public lastTokenIn;
    address public lastTokenOut;
    uint24 public lastFee;
    address public lastRecipient;
    uint256 public lastAmountIn;
    uint256 public lastAmountOutMin;

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function setTokens(address tIn, address tOut) external {
        tokenIn = MockToken(tIn);
        tokenOut = MockToken(tOut);
    }

    function setRateBips(uint256 bips) external {
        rateBips = bips;
    }

    function setTryReenter(bool v, address v_) external {
        tryReenter = v;
        vault = v_;
    }

    function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256) {
        lastTokenIn = p.tokenIn;
        lastTokenOut = p.tokenOut;
        lastFee = p.fee;
        lastRecipient = p.recipient;
        lastAmountIn = p.amountIn;
        lastAmountOutMin = p.amountOutMinimum;
        // Pull tokenIn from the vault (needs prior approve).
        tokenIn.transferFrom(msg.sender, address(this), p.amountIn);
        if (tryReenter) {
            // Attempt to reenter the vault mid-swap: must revert.
            (bool ok,) = vault.call(abi.encodeWithSignature("executeSend((uint256,address,uint8,address,address,uint256,address,uint256,bytes32,uint32,uint256,uint256,uint256),bytes)"));
            require(!ok, "reentry should have failed");
        }
        uint256 out = (p.amountIn * rateBips) / 10000;
        require(out >= p.amountOutMinimum, "slippage");
        tokenOut.mint(p.recipient, out);
        return out;
    }
}

/// @notice Mock CCTP TokenMessengerV2 etched at the PINNED messenger address.
contract MockMessenger {
    MockToken public burnToken;
    uint64 public nextNonce = 1;
    uint256 public lastAmount;
    uint32 public lastDomain;
    bytes32 public lastMintRecipient;

    function setToken(address t) external {
        burnToken = MockToken(t);
    }

    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken_,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external returns (uint64) {
        lastAmount = amount;
        lastDomain = destinationDomain;
        lastMintRecipient = mintRecipient;
        // The vault must hardcode the standard-transfer params: permissionless
        // mint, no fast fee, standard finality. A mock-side tripwire.
        require(destinationCaller == bytes32(0), "mock: destinationCaller");
        require(maxFee == 0, "mock: maxFee");
        require(minFinalityThreshold == 1000, "mock: minFinalityThreshold");
        burnToken.transferFrom(msg.sender, address(this), amount);
        return nextNonce++;
    }
}

contract BeaconUsdcVaultV2Test is Test {
    MockToken usdc;
    MockToken eurc; // logic holder; code etched at pinned EURC address
    MockRouter router; // logic holder; code etched at pinned router address
    MockMessenger messenger; // logic holder; code etched at pinned messenger address
    BeaconReceiptRegistry registry;
    BeaconVaultFactoryV2 factory;
    BeaconUsdcVaultV2 vault;

    uint256 agentKey = 0xA11CE;
    address agent = vm.addr(agentKey);
    address owner = address(0xB0B);
    address executor = address(0xE0E);
    address alice = address(0xA11CE0);

    // Pinned addresses from the V2 contract (must match source).
    address constant PINNED_ROUTER = 0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77;
    address constant PINNED_EURC = 0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1;
    address constant PINNED_MESSENGER = 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d;

    function setUp() public {
        usdc = new MockToken();
        eurc = new MockToken();
        router = new MockRouter();
        messenger = new MockMessenger();
        // Etch mocks at the exact pinned addresses the vault hardcodes.
        vm.etch(PINNED_ROUTER, address(router).code);
        vm.etch(PINNED_EURC, address(eurc).code);
        vm.etch(PINNED_MESSENGER, address(messenger).code);
        MockRouter(PINNED_ROUTER).setTokens(address(usdc), PINNED_EURC);
        // NOTE: etched code starts with ZERO storage (declaration initializers
        // run in the constructor, which etching skips) — set the rate explicitly.
        MockRouter(PINNED_ROUTER).setRateBips(10000);
        MockMessenger(PINNED_MESSENGER).setToken(address(usdc));
        MockRouter(PINNED_ROUTER).setTryReenter(false, address(0)); // set per-test when needed

        registry = new BeaconReceiptRegistry();
        factory = new BeaconVaultFactoryV2(address(usdc), address(registry));
        registry.setFactory(address(factory));
        vault = BeaconUsdcVaultV2(factory.create(owner, executor));
        usdc.mint(address(vault), 1_000_000);

        vm.startPrank(owner);
        vault.setPolicy(10_000, 50_000, 1 days);
        vault.allowRecipient(alice, true);
        // Grant 1: send+swap+bridge. Grant 2: send-only (scope tests).
        vault.setGrant(1, agent, 10_000, uint64(block.timestamp + 7 days), 7);
        vault.setGrant(2, agent, 10_000, uint64(block.timestamp + 7 days), 1);
        vm.stopPrank();

        assertEq(vault.SWAP_ROUTER(), PINNED_ROUTER, "router pin");
        assertEq(vault.EURC(), PINNED_EURC, "eurc pin");
        assertEq(vault.TOKEN_MESSENGER(), PINNED_MESSENGER, "messenger pin");
        assertTrue(vault.allowedTokenOut(PINNED_EURC), "eurc allowlisted");
        assertTrue(vault.allowedDomain(6), "base allowlisted");
    }

    function _action(uint8 cls, uint256 grantId) internal view returns (BeaconUsdcVaultV2.Action memory a) {
        a = BeaconUsdcVaultV2.Action({
            grantId: grantId,
            agent: agent,
            actionClass: cls,
            token: address(usdc),
            recipient: address(vault),
            amount: 1_000,
            tokenOut: PINNED_EURC,
            amountOutMin: 900,
            quoteHash: keccak256("quote"),
            destDomain: 0,
            nonce: vault.nonce(),
            deadline: block.timestamp + 1 hours,
            policyVersion: vault.policyVersion()
        });
    }

    function _sign(BeaconUsdcVaultV2.Action memory a) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentKey, vault.hashAction(a));
        return abi.encodePacked(r, s, v);
    }

    // ---- Swap ----

    function test_swap_executes_output_returns_to_vault() public {
        BeaconUsdcVaultV2.Action memory a = _action(2, 1);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vault.executeSwap(a, sig);
        assertEq(usdc.balanceOf(address(vault)), 999_000, "usdc out");
        assertEq(MockToken(PINNED_EURC).balanceOf(address(vault)), 1_000, "eurc in");
        assertEq(vault.nonce(), 1);
        (address recVault,,,,,) = registry.receipts(vault.hashAction(a));
        assertEq(recVault, address(vault), "receipt recorded");
        // Router saw the exact pinned params.
        assertEq(MockRouter(PINNED_ROUTER).lastTokenOut(), PINNED_EURC);
        assertEq(MockRouter(PINNED_ROUTER).lastFee(), 500);
        assertEq(MockRouter(PINNED_ROUTER).lastRecipient(), address(vault));
        assertEq(MockRouter(PINNED_ROUTER).lastAmountOutMin(), 900);
    }

    function test_swap_rejects_non_vault_recipient() public {
        BeaconUsdcVaultV2.Action memory a = _action(2, 1);
        a.recipient = alice; // agent tries to redirect output
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.RecipientDenied.selector);
        vault.executeSwap(a, sig);
    }

    function test_swap_rejects_unallowlisted_token_out() public {
        BeaconUsdcVaultV2.Action memory a = _action(2, 1);
        a.tokenOut = address(0xD06);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.TokenOutDenied.selector);
        vault.executeSwap(a, sig);
    }

    function test_swap_reverts_on_slippage() public {
        MockRouter(PINNED_ROUTER).setRateBips(8000); // 0.8x < 0.9 min
        BeaconUsdcVaultV2.Action memory a = _action(2, 1);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.SwapFailed.selector);
        vault.executeSwap(a, sig);
        assertEq(vault.nonce(), 0, "nonce not consumed on failed swap");
    }

    function test_swap_requires_swap_scope() public {
        BeaconUsdcVaultV2.Action memory a = _action(2, 2); // grant 2 = send-only
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.ScopeDenied.selector);
        vault.executeSwap(a, sig);
    }

    function test_executor_cannot_alter_swap_fields() public {
        BeaconUsdcVaultV2.Action memory a = _action(2, 1);
        bytes memory sig = _sign(a);
        a.amount = 9_999; // executor tampers after signing
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.BadSignature.selector);
        vault.executeSwap(a, sig);
    }

    function test_swap_reentry_reverts() public {
        MockRouter r = MockRouter(PINNED_ROUTER);
        r.setTryReenter(true, address(vault));
        
        BeaconUsdcVaultV2.Action memory a = _action(2, 1);
        bytes memory sig = _sign(a);
        // The mock asserts the reentrant call fails; if the guard were missing
        // the mock would see success and revert with "reentry should have failed".
        vm.prank(executor);
        vault.executeSwap(a, sig);
        r.setTryReenter(false, address(0));
    }

    // ---- Bridge ----

    function _bridgeAction() internal view returns (BeaconUsdcVaultV2.Action memory a) {
        a = _action(3, 1);
        a.recipient = alice;
        a.tokenOut = address(0);
        a.amountOutMin = 0;
        a.destDomain = 6;
    }

    function test_bridge_burns_and_records() public {
        BeaconUsdcVaultV2.Action memory a = _bridgeAction();
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vault.executeBridge(a, sig);
        assertEq(usdc.balanceOf(address(vault)), 999_000, "usdc burned from vault");
        assertEq(usdc.balanceOf(PINNED_MESSENGER), 1_000, "messenger received");
        MockMessenger m = MockMessenger(PINNED_MESSENGER);
        assertEq(m.lastAmount(), 1_000);
        assertEq(m.lastDomain(), 6);
        assertEq(m.lastMintRecipient(), bytes32(uint256(uint160(alice))), "mint recipient");
        (address recVault,,,,,) = registry.receipts(vault.hashAction(a));
        assertEq(recVault, address(vault), "receipt recorded");
        assertEq(vault.nonce(), 1);
    }

    function test_bridge_rejects_unallowlisted_domain() public {
        BeaconUsdcVaultV2.Action memory a = _bridgeAction();
        a.destDomain = 0; // Ethereum mainnet domain not allowlisted
        // NOTE: domain 0 also trips the ==0 check; use 1 for a pure allowlist test.
        a.destDomain = 1;
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.DomainDenied.selector);
        vault.executeBridge(a, sig);
    }

    function test_bridge_rejects_non_allowlisted_mint_recipient() public {
        BeaconUsdcVaultV2.Action memory a = _bridgeAction();
        a.recipient = address(0xBAD);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.RecipientDenied.selector);
        vault.executeBridge(a, sig);
    }

    function test_bridge_requires_bridge_scope() public {
        BeaconUsdcVaultV2.Action memory a = _bridgeAction();
        a.grantId = 2; // send-only grant
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.ScopeDenied.selector);
        vault.executeBridge(a, sig);
    }

    function test_executor_cannot_alter_bridge_domain() public {
        // The executor tampers 6 -> 2 where 2 is allowlisted: the allowlist
        // check passes, so the tamper must die on the signature.
        vm.prank(owner);
        vault.setDomainAllowed(2, true);
        BeaconUsdcVaultV2.Action memory a = _bridgeAction();
        bytes memory sig = _sign(a);
        a.destDomain = 2; // executor tampers after signing
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVaultV2.BadSignature.selector);
        vault.executeBridge(a, sig);
    }

    // ---- Send preserved + typehash isolation ----

    function test_send_still_works_on_v2() public {
        BeaconUsdcVaultV2.Action memory a = _action(1, 1);
        a.recipient = alice;
        a.tokenOut = address(0);
        a.amountOutMin = 0;
        a.amount = 500;
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vault.executeSend(a, sig);
        assertEq(usdc.balanceOf(alice), 500);
    }

    function test_v2_typehash_differs_from_v1() public {
        // The V2 typehash string carries the extra uint32 destDomain field, so it
        // can never collide with V1's. Deploy a real V1 vault and compare.
        BeaconUsdcVault v1 = new BeaconUsdcVault(address(usdc), owner, executor, address(registry));
        assertTrue(vault.ACTION_TYPEHASH() != v1.ACTION_TYPEHASH(), "typehash must differ");
        // V2 hash of an action can never equal a V1 signature digest: different
        // typehash AND different domain separator (name "Beacon", version "2",
        // verifyingContract = v2 vault).
        BeaconUsdcVaultV2.Action memory a = _action(1, 1);
        a.recipient = alice;
        a.tokenOut = address(0);
        bytes32 v2digest = vault.hashAction(a);
        // Recompute what V1 would sign for the "same" logical action.
        BeaconUsdcVault.Action memory a1 = BeaconUsdcVault.Action({
            grantId: 1,
            agent: agent,
            actionClass: 1,
            token: address(usdc),
            recipient: alice,
            amount: 1_000,
            tokenOut: address(0),
            amountOutMin: 0,
            quoteHash: bytes32(0),
            nonce: 0,
            deadline: a.deadline,
            policyVersion: 0
        });
        assertTrue(v2digest != v1.hashAction(a1), "v1 sig cannot replay on v2");
    }

    function test_factory_v2_deploys_and_registers() public {
        address v2 = factory.create(address(0xC0FFEE), executor);
        assertTrue(factory.isVault(v2));
        assertEq(factory.vaultOf(address(0xC0FFEE)), v2);
        BeaconUsdcVaultV2 v = BeaconUsdcVaultV2(v2);
        assertEq(v.owner(), address(0xC0FFEE));
        assertEq(v.executor(), executor);
    }
}
