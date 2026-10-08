// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BeaconUsdcVault} from "./BeaconUsdcVault.sol";

contract BeaconVaultFactory {
    address public immutable usdc;
    address public immutable registry;
    mapping(address => address) public vaultOf;
    mapping(address => bool) public isVault;

    event VaultCreated(address indexed owner, address vault);

    error VaultExists();

    constructor(address usdc_, address registry_) {
        usdc = usdc_;
        registry = registry_;
    }

    function create(address owner, address executor) external returns (address vault) {
        if (vaultOf[owner] != address(0)) revert VaultExists();
        vault = address(new BeaconUsdcVault(usdc, owner, executor, registry));
        vaultOf[owner] = vault;
        isVault[vault] = true;
        emit VaultCreated(owner, vault);
    }
}
