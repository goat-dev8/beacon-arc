// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BeaconUsdcVaultV2} from "./BeaconUsdcVaultV2.sol";

/// @title BeaconVaultFactoryV2 — deploys BeaconUsdcVaultV2 instances.
/// @notice A separate factory (not an upgrade of V1's) because:
///         1. BeaconVaultFactory.create() hardcodes `new BeaconUsdcVault` — the
///            implementation is not parameterized, so V1's factory can never
///            mint a V2 vault.
///         2. The V1 receipt registry's `factory` is set once (FactorySet) and
///            points at the V1 factory; its `record()` only accepts vaults in
///            the V1 factory's `isVault` mapping. A V2 vault could never record
///            there. V2 therefore ships its own registry instance (same
///            BeaconReceiptRegistry code, new deployment) pointed at THIS factory.
///         V1 stays live and untouched: its vault, factory, registry, and every
///         proof recorded against them remain valid.
contract BeaconVaultFactoryV2 {
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
        vault = address(new BeaconUsdcVaultV2(usdc, owner, executor, registry));
        vaultOf[owner] = vault;
        isVault[vault] = true;
        emit VaultCreated(owner, vault);
    }
}
