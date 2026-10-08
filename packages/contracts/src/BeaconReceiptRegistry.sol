// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

interface IBeaconVaultFactory {
    function isVault(address vault) external view returns (bool);
}

contract BeaconReceiptRegistry {
    address public factory;
    address public immutable deployer;

    struct Receipt {
        address vault;
        address agent;
        address recipient;
        uint256 amount;
        uint256 nonce;
        bool exists;
    }

    mapping(bytes32 => Receipt) public receipts;

    event Recorded(bytes32 indexed actionHash, address indexed vault, address agent, address recipient, uint256 amount, uint256 nonce);

    error UnknownVault();
    error AlreadyRecorded();
    error FactorySet();
    error NotDeployer();

    constructor() {
        deployer = msg.sender;
    }

    function setFactory(address factory_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (factory != address(0)) revert FactorySet();
        factory = factory_;
    }

    function record(bytes32 actionHash, address vault, address agent, address recipient, uint256 amount, uint256 nonce) external {
        if (!IBeaconVaultFactory(factory).isVault(msg.sender) || msg.sender != vault) revert UnknownVault();
        if (receipts[actionHash].exists) revert AlreadyRecorded();
        receipts[actionHash] = Receipt({vault: vault, agent: agent, recipient: recipient, amount: amount, nonce: nonce, exists: true});
        emit Recorded(actionHash, vault, agent, recipient, amount, nonce);
    }
}
