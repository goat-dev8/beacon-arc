import assert from "node:assert/strict";
import test from "node:test";
import { encodeAbiParameters, keccak256 } from "viem";
import {
  ACTION_TYPES,
  ACTION_TYPES_V2,
  CLASS_BRIDGE,
  CLASS_SEND,
  CLASS_SWAP,
  SCOPE_BRIDGE,
  SCOPE_SEND,
  SCOPE_SWAP,
  V2_TYPE_STRING,
  actionHash,
  actionHashV2,
  bridgeTypedData,
  domain,
  domainV2,
  recoverAgent,
  recoverAgentV2,
  swapTypedData,
} from "./eip712.mjs";
import { ARC_EURC, ARC_USDC, V2_VAULT } from "./constants.mjs";
import { publicClient } from "./chain.mjs";

const AGENT = "0xc3b183D5e4436C20282650348BE2D6c94c4142dc";
const ZERO = "0x0000000000000000000000000000000000000000";

test("V2 type string matches the on-chain BeaconUsdcVaultV2 typehash exactly", () => {
  assert.equal(
    V2_TYPE_STRING,
    "Action(uint256 grantId,address agent,uint8 actionClass,address token,address recipient,uint256 amount,address tokenOut,uint256 amountOutMin,bytes32 quoteHash,uint32 destDomain,uint256 nonce,uint256 deadline,uint256 policyVersion)",
  );
  const v1Fields = ACTION_TYPES.Action.map((f) => f.name);
  const v2Fields = ACTION_TYPES_V2.Action.map((f) => f.name);
  assert.deepEqual(v2Fields.slice(0, 9), v1Fields.slice(0, 9));
  assert.equal(v2Fields[9], "destDomain");
  assert.deepEqual(v2Fields.slice(10), v1Fields.slice(9));
});

test("V2 domain binds version 2 and the V2 vault; V1 keeps version 1", () => {
  const d1 = domain("0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6");
  const d2 = domainV2(V2_VAULT);
  assert.equal(d1.version, "1");
  assert.equal(d2.version, "2");
  assert.equal(d2.name, "Beacon");
  assert.equal(d2.chainId, 5042);
  assert.equal(d2.verifyingContract.toLowerCase(), V2_VAULT.toLowerCase());
});

test("action classes and scope bits match the V2 contract", () => {
  assert.equal(CLASS_SEND, 1);
  assert.equal(CLASS_SWAP, 2);
  assert.equal(CLASS_BRIDGE, 3);
  assert.equal(SCOPE_SEND, 1);
  assert.equal(SCOPE_SWAP, 2);
  assert.equal(SCOPE_BRIDGE, 4);
});

test("swapTypedData forces recipient=vault and destDomain=0", () => {
  const typed = swapTypedData(V2_VAULT, {
    grantId: "1",
    agent: AGENT,
    amount: "5000",
    tokenOut: ARC_EURC,
    amountOutMin: "4418",
    quoteHash: keccak256(encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [5000n, 4463n])),
    nonce: "1",
    deadline: "1792000000",
    policyVersion: "1",
  });
  assert.equal(typed.message.actionClass, 2);
  assert.equal(typed.message.recipient.toLowerCase(), V2_VAULT.toLowerCase());
  assert.equal(typed.message.token.toLowerCase(), ARC_USDC.toLowerCase());
  assert.equal(typed.message.destDomain, 0);
  assert.equal(typed.domain.version, "2");
  assert.equal(typed.primaryType, "Action");
});

test("bridgeTypedData carries the destination domain and mint recipient", () => {
  const mintRecipient = "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd";
  const typed = bridgeTypedData(V2_VAULT, {
    grantId: "1",
    agent: AGENT,
    mintRecipient,
    amount: "5000",
    destDomain: 6,
    nonce: "1",
    deadline: "1792000000",
    policyVersion: "1",
  });
  assert.equal(typed.message.actionClass, 3);
  assert.equal(typed.message.recipient.toLowerCase(), mintRecipient.toLowerCase());
  assert.equal(typed.message.destDomain, 6);
  assert.equal(typed.message.tokenOut, ZERO);
  assert.equal(typed.domain.version, "2");
});

test("V1 and V2 hashes of the same logical action differ (no cross-version replay)", () => {
  const v1action = {
    grantId: "1", agent: AGENT, actionClass: 1, token: ARC_USDC,
    recipient: AGENT, amount: "1000", tokenOut: ZERO, amountOutMin: "0",
    quoteHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    nonce: "0", deadline: "1792000000", policyVersion: "1",
  };
  const v2action = { ...v1action, destDomain: 0 };
  const h1 = actionHash("0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6", v1action);
  const h2 = actionHashV2(V2_VAULT, v2action);
  assert.notEqual(h1.toLowerCase(), h2.toLowerCase());
});

test("recoverAgent and recoverAgentV2 are distinct functions", () => {
  assert.equal(typeof recoverAgent, "function");
  assert.equal(typeof recoverAgentV2, "function");
  assert.notEqual(recoverAgent, recoverAgentV2);
});

// Live: the local V2 encoding must match the vault's own hashAction view.
test("live V2 action hash matches the on-chain BeaconUsdcVaultV2.hashAction", async () => {
  const client = publicClient("https://rpc.mainnet.arc.io");
  const action = {
    grantId: "1",
    agent: AGENT,
    actionClass: 2,
    token: ARC_USDC,
    recipient: V2_VAULT,
    amount: "5000",
    tokenOut: ARC_EURC,
    amountOutMin: "4418",
    quoteHash: keccak256(encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [5000n, 4463n])),
    destDomain: 0,
    nonce: "7",
    deadline: "1792000000",
    policyVersion: "1",
  };
  const local = actionHashV2(V2_VAULT, action);
  const v2HashAbi = [
    {
      type: "function",
      name: "hashAction",
      stateMutability: "view",
      inputs: [
        {
          type: "tuple",
          components: ACTION_TYPES_V2.Action.map((f) => ({ name: f.name, type: f.type })),
        },
      ],
      outputs: [{ type: "bytes32" }],
    },
  ];
  const onchain = await client.readContract({
    address: V2_VAULT,
    abi: v2HashAbi,
    functionName: "hashAction",
    args: [
      {
        grantId: 1n, agent: AGENT, actionClass: 2, token: ARC_USDC, recipient: V2_VAULT,
        amount: 5000n, tokenOut: ARC_EURC, amountOutMin: 4418n, quoteHash: action.quoteHash,
        destDomain: 0, nonce: 7n, deadline: 1792000000n, policyVersion: 1n,
      },
    ],
  });
  assert.equal(local.toLowerCase(), onchain.toLowerCase());
});
