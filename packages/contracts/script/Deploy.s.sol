// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {BeaconReceiptRegistry} from "../src/BeaconReceiptRegistry.sol";
import {BeaconVaultFactory} from "../src/BeaconVaultFactory.sol";

contract Deploy is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(pk);
        BeaconReceiptRegistry registry = new BeaconReceiptRegistry();
        BeaconVaultFactory factory = new BeaconVaultFactory(USDC, address(registry));
        registry.setFactory(address(factory));
        vm.stopBroadcast();
        console2.log("registry", address(registry));
        console2.log("factory", address(factory));
    }
}
