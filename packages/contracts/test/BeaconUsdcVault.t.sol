// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {BeaconUsdcVault} from "../src/BeaconUsdcVault.sol";
import {BeaconReceiptRegistry} from "../src/BeaconReceiptRegistry.sol";
import {BeaconVaultFactory} from "../src/BeaconVaultFactory.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract BeaconUsdcVaultTest is Test {
    MockUSDC usdc;
    BeaconReceiptRegistry registry;
    BeaconVaultFactory factory;
    BeaconUsdcVault vault;

    uint256 agentKey = 0xA11CE;
    address agent = vm.addr(agentKey);
    address owner = address(0xB0B);
    address executor = address(0xE0E);
    address alice = address(0xA11CE0);

    function setUp() public {
        usdc = new MockUSDC();
        registry = new BeaconReceiptRegistry();
        factory = new BeaconVaultFactory(address(usdc), address(registry));
        registry.setFactory(address(factory));
        vault = BeaconUsdcVault(factory.create(owner, executor));
        usdc.mint(address(vault), 1_000_000);
        vm.startPrank(owner);
        vault.setPolicy(10_000, 50_000, 1 days);
        vault.allowRecipient(alice, true);
        vault.setGrant(1, agent, 10_000, uint64(block.timestamp + 7 days), 1);
        vm.stopPrank();
    }

    function _action(uint256 amount, address recipient, uint256 actionNonce) internal view returns (BeaconUsdcVault.Action memory a) {
        a = BeaconUsdcVault.Action({
            grantId: 1,
            agent: agent,
            actionClass: 1,
            token: address(usdc),
            recipient: recipient,
            amount: amount,
            tokenOut: address(0),
            amountOutMin: 0,
            quoteHash: bytes32(0),
            nonce: actionNonce,
            deadline: block.timestamp + 1 hours,
            policyVersion: vault.policyVersion()
        });
    }

    function _sign(BeaconUsdcVault.Action memory a) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentKey, vault.hashAction(a));
        return abi.encodePacked(r, s, v);
    }

    function test_send_moves_exact_usdc() public {
        BeaconUsdcVault.Action memory a = _action(5_000, alice, 0);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vault.executeSend(a, sig);
        assertEq(usdc.balanceOf(alice), 5_000);
        assertEq(usdc.balanceOf(address(vault)), 995_000);
        (address recVault,,,,,) = registry.receipts(vault.hashAction(a));
        assertEq(recVault, address(vault));
    }

    function test_executor_cannot_change_recipient() public {
        BeaconUsdcVault.Action memory a = _action(5_000, alice, 0);
        bytes memory sig = _sign(a);
        a.recipient = address(0xBAD);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.BadSignature.selector);
        vault.executeSend(a, sig);
    }

    function test_unknown_recipient_reverts() public {
        address bob = address(0xB0B2);
        BeaconUsdcVault.Action memory a = _action(1_000, bob, 0);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.RecipientDenied.selector);
        vault.executeSend(a, sig);
    }

    function test_blocked_recipient_reverts() public {
        vm.prank(owner);
        vault.blockRecipient(alice, true);
        BeaconUsdcVault.Action memory a = _action(1_000, alice, 0);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.RecipientDenied.selector);
        vault.executeSend(a, sig);
    }

    function test_replay_reverts() public {
        BeaconUsdcVault.Action memory a = _action(1_000, alice, 0);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vault.executeSend(a, sig);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.BadNonce.selector);
        vault.executeSend(a, sig);
    }

    function test_over_cap_reverts() public {
        BeaconUsdcVault.Action memory a = _action(10_001, alice, 0);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.OverCap.selector);
        vault.executeSend(a, sig);
    }

    function test_executor_cannot_withdraw() public {
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.NotOwner.selector);
        vault.withdraw(executor, 1);
    }

    function test_stranger_cannot_execute() public {
        BeaconUsdcVault.Action memory a = _action(1_000, alice, 0);
        bytes memory sig = _sign(a);
        vm.prank(address(0x1234));
        vm.expectRevert(BeaconUsdcVault.NotExecutor.selector);
        vault.executeSend(a, sig);
    }

    function test_revoked_grant_reverts() public {
        vm.prank(owner);
        vault.revokeGrant(1);
        BeaconUsdcVault.Action memory a = _action(1_000, alice, 0);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.GrantInactive.selector);
        vault.executeSend(a, sig);
    }

    function test_paused_reverts() public {
        vm.prank(owner);
        vault.setPaused(true);
        BeaconUsdcVault.Action memory a = _action(1_000, alice, 0);
        bytes memory sig = _sign(a);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.PausedVault.selector);
        vault.executeSend(a, sig);
    }

    function test_policy_change_invalidates_old_signature() public {
        BeaconUsdcVault.Action memory a = _action(1_000, alice, 0);
        bytes memory sig = _sign(a);
        vm.prank(owner);
        vault.setPolicy(10_000, 50_000, 1 days);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.PolicyMismatch.selector);
        vault.executeSend(a, sig);
    }

    function test_window_second_payment_reverts() public {
        BeaconUsdcVault.Action memory first = _action(10_000, alice, 0);
        bytes memory s1 = _sign(first);
        vm.prank(executor);
        vault.executeSend(first, s1);
        BeaconUsdcVault.Action memory second = _action(10_000, alice, 1);
        bytes memory s2 = _sign(second);
        vm.prank(executor);
        vault.executeSend(second, s2);
        BeaconUsdcVault.Action memory third = _action(10_000, alice, 2);
        bytes memory s3 = _sign(third);
        vm.prank(executor);
        vault.executeSend(third, s3);
        BeaconUsdcVault.Action memory fourth = _action(10_000, alice, 3);
        bytes memory s4 = _sign(fourth);
        vm.prank(executor);
        vault.executeSend(fourth, s4);
        BeaconUsdcVault.Action memory fifth = _action(10_000, alice, 4);
        bytes memory s5 = _sign(fifth);
        vm.prank(executor);
        vault.executeSend(fifth, s5);
        BeaconUsdcVault.Action memory sixth = _action(1, alice, 5);
        bytes memory s6 = _sign(sixth);
        vm.prank(executor);
        vm.expectRevert(BeaconUsdcVault.OverWindow.selector);
        vault.executeSend(sixth, s6);
    }
}
