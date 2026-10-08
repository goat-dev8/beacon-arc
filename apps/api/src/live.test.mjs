import assert from "node:assert/strict";
import test from "node:test";
import { onchainActionHash, publicClient, readDecimals } from "./chain.mjs";
import { actionHash } from "./eip712.mjs";

const rpc = "https://rpc.mainnet.arc.io";
const vault = "0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6";

test("live USDC decimals are 6 and the local action hash matches the vault", async () => {
  const client = publicClient(rpc);
  const decimals = await readDecimals(client);
  assert.equal(decimals, 6);
  const action = {
    grantId: "1",
    agent: "0xc3b183D5e4436C20282650348BE2D6c94c4142dc",
    actionClass: 1,
    token: "0x3600000000000000000000000000000000000000",
    recipient: "0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034",
    amount: "10000",
    tokenOut: "0x0000000000000000000000000000000000000000",
    amountOutMin: "0",
    quoteHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    nonce: "0",
    deadline: "1791439594",
    policyVersion: "1",
  };
  const local = actionHash(vault, action);
  const onchain = await onchainActionHash(client, vault, action);
  assert.equal(local.toLowerCase(), onchain.toLowerCase());
});
