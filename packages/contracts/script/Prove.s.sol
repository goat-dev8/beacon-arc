// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {BeaconUsdcVault} from "../src/BeaconUsdcVault.sol";
import {BeaconVaultFactory} from "../src/BeaconVaultFactory.sol";

interface IUsdc {
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @notice Creates one vault, deposits 0.02 USDC, and sends 0.01 USDC back to the owner.
contract Prove is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;
    BeaconVaultFactory constant FACTORY = BeaconVaultFactory(0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b);

    function run() external {
        uint256 deployer = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 executorPk = vm.envUint("EXECUTOR_PRIVATE_KEY");
        uint256 agentPk = vm.envUint("AGENT_PRIVATE_KEY");
        address owner = vm.addr(deployer);
        address executor = vm.addr(executorPk);
        address agent = vm.addr(agentPk);

        vm.startBroadcast(deployer);
        payable(executor).transfer(0.05 ether);
        BeaconUsdcVault vault = BeaconUsdcVault(FACTORY.create(owner, executor));
        require(IUsdc(USDC).transfer(address(vault), 20_000), "deposit");
        vault.setPolicy(10_000, 50_000, 1 days);
        vault.allowRecipient(owner, true);
        vault.setGrant(1, agent, 10_000, uint64(block.timestamp + 7 days), 1);
        vm.stopBroadcast();

        BeaconUsdcVault.Action memory action = BeaconUsdcVault.Action({
            grantId: 1,
            agent: agent,
            actionClass: 1,
            token: USDC,
            recipient: owner,
            amount: 10_000,
            tokenOut: address(0),
            amountOutMin: 0,
            quoteHash: bytes32(0),
            nonce: 0,
            deadline: block.timestamp + 1 hours,
            policyVersion: 1
        });
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(agentPk, vault.hashAction(action));

        vm.startBroadcast(executorPk);
        vault.executeSend(action, abi.encodePacked(r, s, v));
        vm.stopBroadcast();

        console2.log("vault", address(vault));
        console2.log("owner", owner);
        console2.log("agent", agent);
    }
}
