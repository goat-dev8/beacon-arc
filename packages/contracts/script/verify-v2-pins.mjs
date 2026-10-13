#!/usr/bin/env node
// verify-v2-pins.mjs — pre-deploy checklist for BeaconUsdcVaultV2.
// Validates EVERY hardcoded address in the V2 contracts against LIVE Arc
// mainnet BEFORE anyone deploys. Read-only. No keys needed.
//
// Run: node script/verify-v2-pins.mjs
// Exit 0 = all pins valid. Exit 1 = something is wrong; DO NOT deploy.

import { createPublicClient, http } from "viem";

const RPC = process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io";
const CHAIN_ID = 5042;

// Must match the constants in src/BeaconUsdcVaultV2.sol exactly.
const PINS = {
  USDC: "0x3600000000000000000000000000000000000000",
  EURC: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1",
  SWAP_ROUTER: "0x53BF6B0684Ec7eF91e1387Da3D1a1769bC5A6F77",
  USDC_EURC_POOL: "0x6fd5F2fb831940DcD61A98c5B3aCB7D8C6f3bFc1",
  SWAP_FEE: 500,
  TOKEN_MESSENGER: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
  // Cross-checks (not pinned in the vault, but the pins depend on them).
  V3_FACTORY: "0xf0db7b58379503491d857dB50AC9ece64c653918",
  MESSAGE_TRANSMITTER: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
  CCTP_LOCAL_DOMAIN: 26,
  CCTP_BASE_DOMAIN: 6,
};

const client = createPublicClient({ transport: http(RPC) });
let failures = 0;

async function check(name, fn) {
  try {
    const detail = await fn();
    console.log(`ok   ${name}${detail ? " — " + detail : ""}`);
  } catch (e) {
    failures++;
    console.log(`FAIL ${name} — ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const codeSize = async (addr) => {
  const code = await client.getCode({ address: addr });
  return code ? (code.length - 2) / 2 : 0;
};

const chainId = await client.getChainId();
assert(chainId === CHAIN_ID, `chainId ${chainId} != ${CHAIN_ID}`);
console.log(`ok   chainId == ${CHAIN_ID}`);

await check("USDC has code", async () => {
  const n = await codeSize(PINS.USDC);
  assert(n > 0, "no code");
  return `${n} bytes`;
});

await check("EURC has code", async () => {
  const n = await codeSize(PINS.EURC);
  assert(n > 0, "no code");
  return `${n} bytes`;
});

await check("SWAP_ROUTER has code", async () => {
  const n = await codeSize(PINS.SWAP_ROUTER);
  assert(n > 1000, `suspiciously small: ${n}`);
  return `${n} bytes`;
});

await check("SWAP_ROUTER.factory() == V3_FACTORY", async () => {
  const f = await client.readContract({
    address: PINS.SWAP_ROUTER,
    abi: [{ name: "factory", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }],
    functionName: "factory",
  });
  assert(f.toLowerCase() === PINS.V3_FACTORY.toLowerCase(), `got ${f}`);
  return f;
});

await check("V3_FACTORY.getPool(USDC,EURC,500) == USDC_EURC_POOL", async () => {
  const p = await client.readContract({
    address: PINS.V3_FACTORY,
    abi: [{ name: "getPool", type: "function", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }, { type: "uint24" }], outputs: [{ type: "address" }] }],
    functionName: "getPool",
    args: [PINS.USDC, PINS.EURC, PINS.SWAP_FEE],
  });
  assert(p.toLowerCase() === PINS.USDC_EURC_POOL.toLowerCase(), `got ${p}`);
  return p;
});

await check("TOKEN_MESSENGER has code", async () => {
  const n = await codeSize(PINS.TOKEN_MESSENGER);
  assert(n > 1000, `suspiciously small: ${n}`);
  return `${n} bytes`;
});

await check("MessageTransmitter.localDomain() == 26 (Arc)", async () => {
  const d = await client.readContract({
    address: PINS.MESSAGE_TRANSMITTER,
    abi: [{ name: "localDomain", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] }],
    functionName: "localDomain",
  });
  assert(Number(d) === PINS.CCTP_LOCAL_DOMAIN, `got ${d}`);
  return `domain ${d}`;
});

await check("TOKEN_MESSENGER.messageBodyVersion() readable (CCTP V2 shape)", async () => {
  // V1 messenger lacks messageBodyVersion; its presence confirms V2.
  try {
    const v = await client.readContract({
      address: PINS.TOKEN_MESSENGER,
      abi: [{ name: "messageBodyVersion", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] }],
      functionName: "messageBodyVersion",
    });
    return `version ${v}`;
  } catch {
    throw new Error("messageBodyVersion unreadable — not CCTP V2?");
  }
});

console.log(failures === 0 ? "\nALL PINS VALID — safe to deploy V2." : `\n${failures} CHECK(S) FAILED — DO NOT DEPLOY.`);
process.exit(failures === 0 ? 0 : 1);
