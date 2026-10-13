import assert from "node:assert/strict";
import test from "node:test";
import { normalizeApiSwapQuote } from "./swapQuote.ts";

test("v3 quoted body normalizes with venue and executable:false", () => {
  const q = normalizeApiSwapQuote(
    {
      status: "quoted",
      venue: "uniswap-v3",
      amountIn: "10000",
      amountOut: "892767",
      reason: "The live vault has no swap function. This quoter read is not a trade.",
    },
    "10000",
  );
  assert.equal(q.status, "quoted");
  assert.equal(q.venue, "uniswap-v3");
  assert.equal(q.amountOut, "892767");
  assert.equal(q.executable, false);
  assert.equal(q.indicative, undefined);
});

test("v2 fallback body keeps indicative flag", () => {
  const q = normalizeApiSwapQuote(
    {
      status: "quoted",
      venue: "uniswap-v2",
      indicative: true,
      amountIn: "10000",
      amountOut: "146774",
      reason: "indicative only",
    },
    "10000",
  );
  assert.equal(q.venue, "uniswap-v2");
  assert.equal(q.indicative, true);
  assert.equal(q.executable, false);
});

test("NO_ROUTE and UNAVAILABLE statuses map through", () => {
  assert.equal(normalizeApiSwapQuote({ status: "NO_ROUTE", amountIn: "10000" }, "10000").status, "NO_ROUTE");
  assert.equal(
    normalizeApiSwapQuote({ status: "UNAVAILABLE", venue: "uniswap-v3", amountIn: "10000" }, "10000").status,
    "UNAVAILABLE",
  );
  // Unknown statuses degrade to NO_ROUTE rather than "quoted".
  assert.equal(normalizeApiSwapQuote({ status: "weird", amountIn: "10000" }, "10000").status, "NO_ROUTE");
});

test("missing amountIn falls back to the requested amount", () => {
  const q = normalizeApiSwapQuote({ status: "quoted", venue: "uniswap-v3", amountOut: "1" }, "10000");
  assert.equal(q.amountIn, "10000");
});
