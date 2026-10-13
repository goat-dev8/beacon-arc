#!/usr/bin/env node
// deploy-v2.mjs — deploys the Beacon V2 stack on Arc mainnet (5042).
//
// WHAT IT DEPLOYS (v1 stays live and untouched):
//   1. BeaconReceiptRegistry   (fresh instance; same code as v1's registry)
//   2. BeaconVaultFactoryV2    (creates BeaconUsdcVaultV2)
//   3. registry.setFactory(factory)
//   4. factory.create(owner, executor) -> BeaconUsdcVaultV2
//
// KEYS: read ONLY from process.env at runtime. NEVER printed, logged, or
// written anywhere. Required: DEPLOYER_PRIVATE_KEY. Optional: ARC_RPC_URL,
// V2_OWNER, V2_EXECUTOR (default: the deployer address for both).
//
// PREREQUISITES: `forge build` must have run in packages/contracts (the script
// reads bytecode from ./out). Run `node script/verify-v2-pins.mjs` first.
//
// Run:  node script/deploy-v2.mjs [--dry-run]
// Writes: ../../evidence/v2-deployment.json  (never touches v1 evidence)

import { createPublicClient, createWalletClient, http, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry-run");
const RPC = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
const CHAIN_ID = 5042;
const USDC = "0x3600000000000000000000000000000000000000";

function artifact(contractFile, contractName) {
  const p = join(HERE, "..", "out", contractFile, `${contractName}.json`);
  if (!existsSync(p)) {
    console.error(`MISSING ARTIFACT: ${p}\nRun \`forge build\` in packages/contracts first.`);
    process.exit(1);
  }
  const j = JSON.parse(readFileSync(p, "utf8"));
  if (!j.bytecode?.object || j.bytecode.object === "0x") {
    console.error(`EMPTY BYTECODE in ${p}`);
    process.exit(1);
  }
  return { abi: j.abi, bytecode: j.bytecode.object };
}

const rawPk = process.env.DEPLOYER_PRIVATE_KEY;
if (!rawPk) {
  console.error("DEPLOYER_PRIVATE_KEY is not set. Refusing to continue.");
  process.exit(1);
}
// Never print the key. Normalize 0x prefix quietly.
const pk = rawPk.trim().startsWith("0x") ? rawPk.trim() : "0x" + rawPk.trim();
const account = privateKeyToAccount(pk);

const publicClient = createPublicClient({ transport: http(RPC) });
const walletClient = createWalletClient({ account, transport: http(RPC) });

const owner = getAddress(process.env.V2_OWNER || account.address);
const executor = getAddress(process.env.V2_EXECUTOR || account.address);

const chainId = await publicClient.getChainId();
if (chainId !== CHAIN_ID) throw new Error(`wrong chain: ${chainId}`);

const registryArt = artifact("BeaconReceiptRegistry.sol", "BeaconReceiptRegistry");
const factoryArt = artifact("BeaconVaultFactoryV2.sol", "BeaconVaultFactoryV2");

console.log(`deployer:  ${account.address}`);
console.log(`v2 owner:  ${owner}`);
console.log(`v2 executor: ${executor}`);
if (DRY) console.log("--dry-run: no transactions will be sent\n");

async function deploy(name, art, args) {
  console.log(`deploying ${name}(${args.join(", ") || "no args"})...`);
  if (DRY) return { address: "(dry-run)", tx: "(dry-run)" };
  const hash = await walletClient.deployContract({ abi: art.abi, bytecode: art.bytecode, args });
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  if (rcpt.status !== "success" || !rcpt.contractAddress) throw new Error(`${name} deploy failed: ${hash}`);
  console.log(`  -> ${rcpt.contractAddress}  tx ${hash}  block ${rcpt.blockNumber}`);
  return { address: getAddress(rcpt.contractAddress), tx: hash, block: Number(rcpt.blockNumber) };
}

async function write(name, art, address, functionName, args) {
  console.log(`calling ${name}.${functionName}(${args.join(", ")})...`);
  if (DRY) return "(dry-run)";
  const hash = await walletClient.writeContract({ address, abi: art.abi, functionName, args });
  const rcpt = await publicClient.waitForTransactionReceipt({ hash });
  if (rcpt.status !== "success") throw new Error(`${functionName} failed: ${hash}`);
  console.log(`  tx ${hash}  block ${rcpt.blockNumber}`);
  return hash;
}

// 1 + 2 + 3: registry, factory, link them.
const reg = await deploy("BeaconReceiptRegistry", registryArt, []);
const fac = await deploy("BeaconVaultFactoryV2", factoryArt, [USDC, reg.address]);
await write("BeaconReceiptRegistry", registryArt, reg.address, "setFactory", [fac.address]);

// 4: create the V2 vault through the factory (sets isVault for the registry).
console.log(`calling BeaconVaultFactoryV2.create(${owner}, ${executor})...`);
let vault;
if (DRY) {
  vault = "(dry-run)";
} else {
  const hash = await walletClient.writeContract({
    address: fac.address,
    abi: factoryArt.abi,
    functionName: "create",
    args: [owner, executor],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  vault = await publicClient.readContract({
    address: fac.address,
    abi: factoryArt.abi,
    functionName: "vaultOf",
    args: [owner],
  });
  vault = getAddress(vault);
  console.log(`  -> vault ${vault}  tx ${hash}`);
}

// Verify the wiring on-chain.
if (!DRY) {
  const isVault = await publicClient.readContract({
    address: fac.address, abi: factoryArt.abi, functionName: "isVault", args: [vault],
  });
  const regFactory = await publicClient.readContract({
    address: reg.address, abi: registryArt.abi, functionName: "factory",
  });
  const code = await publicClient.getCode({ address: vault });
  if (!isVault) throw new Error("factory.isVault(vault) == false");
  if (regFactory.toLowerCase() !== fac.address.toLowerCase()) throw new Error("registry.factory mismatch");
  if (!code || code.length < 10) throw new Error("vault has no code");
  console.log("wiring verified: isVault=true, registry.factory=factory, vault has code");
}

const evidence = {
  network: "arc-mainnet",
  chainId: CHAIN_ID,
  deployedAt: new Date().toISOString(),
  deployer: account.address,
  v2Owner: owner,
  v2Executor: executor,
  contracts: {
    registry: reg.address,
    factory: fac.address,
    vault: vault,
  },
  txs: { registry: reg.tx, factory: fac.tx },
  pins: {
    usdc: USDC,
    eurc: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
    swapRouter: "0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77",
    usdcEurcPool: "0x6fd5F2fb831940DcD61A98c5B3aCB7D8C6f3bFc1",
    swapFee: 500,
    tokenMessenger: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
    initialTokenOutAllowlist: ["0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1"],
    initialDomainAllowlist: [6],
  },
  note: "V1 (0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6) untouched. V1 evidence in evidence/deployment.json.",
};

if (!DRY) {
  const outDir = join(HERE, "..", "..", "evidence");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "v2-deployment.json");
  writeFileSync(outPath, JSON.stringify(evidence, null, 2) + "\n");
  console.log(`evidence written: ${outPath}`);
} else {
  console.log("dry-run complete — no evidence written.");
}
