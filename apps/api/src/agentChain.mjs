import { parseAbi } from "viem";
import { ARC_EURC, ARC_USDC, V2_VAULT } from "./constants.mjs";

const abi = parseAbi([
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function maxPerTx() view returns (uint256)",
  "function windowLimit() view returns (uint256)",
  "function windowSpent() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function policyVersion() view returns (uint256)",
  "function allowedRecipient(address) view returns (bool)",
  "function blockedRecipient(address) view returns (bool)",
  "function allowedTokenOut(address) view returns (bool)",
  "function grants(uint256) view returns (address agent, uint256 maxPerTx, uint64 expiry, uint8 scopes, bool active)",
]);

export async function loadV2(client, vault = V2_VAULT) {
  const [owner, paused, maxPerTx, windowLimit, windowSpent, nonce, policyVersion, grant] = await Promise.all([
    client.readContract({ address: vault, abi, functionName: "owner" }),
    client.readContract({ address: vault, abi, functionName: "paused" }),
    client.readContract({ address: vault, abi, functionName: "maxPerTx" }),
    client.readContract({ address: vault, abi, functionName: "windowLimit" }),
    client.readContract({ address: vault, abi, functionName: "windowSpent" }),
    client.readContract({ address: vault, abi, functionName: "nonce" }),
    client.readContract({ address: vault, abi, functionName: "policyVersion" }),
    client.readContract({ address: vault, abi, functionName: "grants", args: [1n] }),
  ]);
  return {
    vault,
    owner,
    paused,
    maxPerTx,
    windowLimit,
    windowSpent,
    nonce,
    policyVersion,
    usdc: ARC_USDC,
    eurc: ARC_EURC,
    grant: {
      agent: grant[0],
      maxPerTx: grant[1],
      expiry: grant[2],
      scopes: Number(grant[3]),
      active: grant[4],
    },
  };
}

export async function loadRecipient(client, vault, recipient) {
  const [allowed, blocked] = await Promise.all([
    client.readContract({ address: vault, abi, functionName: "allowedRecipient", args: [recipient] }),
    client.readContract({ address: vault, abi, functionName: "blockedRecipient", args: [recipient] }),
  ]);
  return { allowed, blocked };
}

export async function loadTokenOut(client, vault, token) {
  return client.readContract({ address: vault, abi, functionName: "allowedTokenOut", args: [token] });
}
