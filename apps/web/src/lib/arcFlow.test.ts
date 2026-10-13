import { describe, expect, it } from "vitest";
import { answerFlow } from "./arcApi";

describe("answerFlow", () => {
  it("quotes a swap from the v3 API and refuses a trade when the vault has no swap selector", () => {
    const text = answerFlow("Can I swap USDC?", {
      vault: null,
      ownerConnected: true,
      quote: {
        status: "quoted",
        venue: "uniswap-v3",
        quoter: "0x0000000000000000000000000000000000000001",
        pool: "0x0000000000000000000000000000000000000002",
        fee: 500,
        amountIn: "10000",
        amountOut: "8927",
        executable: false,
        reason: "The live vault has no swap function. This quoter read is not a trade.",
      },
      rail: {
        block: "25470000",
        vaultBytes: 5047,
        vaultHasSend: true,
        vaultHasSwap: false,
      },
    });
    expect(text).toContain("Uniswap v3");
    expect(text).toContain("8927 EURC base units");
    expect(text).toContain("executable: false");
    expect(text).toContain("0x0000000000000000000000000000000000000001");
    expect(text).toContain("contains executeSend");
    expect(text).toContain("does not contain swapExactTokensForTokens");
    expect(text).toContain("will not trade");
    expect(text).not.toContain("getAmountsOut");
    expect(text).not.toContain("## Allowlist");
  });

  it("marks the v2 fallback as indicative only, never as v3", () => {
    const text = answerFlow("Can I swap USDC?", {
      vault: null,
      ownerConnected: true,
      quote: {
        status: "quoted",
        venue: "uniswap-v2",
        indicative: true,
        amountIn: "10000",
        amountOut: "1467",
        executable: false,
        reason: "direct router read — the quote API was unreachable",
      },
      rail: { block: "25470000", vaultBytes: 5047, vaultHasSend: true, vaultHasSwap: false },
    });
    expect(text).toContain("Uniswap v2 (indicative only)");
    expect(text).toContain("indicative only — the v3 quote API was unreachable");
    expect(text).toContain("executable: false");
  });

  it("never invents a number when the quoter returns nothing", () => {
    const text = answerFlow("Can I swap USDC?", {
      vault: null,
      ownerConnected: true,
      quote: {
        status: "NO_ROUTE",
        venue: "uniswap-v3",
        amountIn: "10000",
        executable: false,
        reason: "The quoter returned no output.",
      },
      rail: { block: "25470000" },
    });
    expect(text).toContain("returned no output");
    expect(text).not.toMatch(/\d{4,} EURC base units/);
  });

  it("treats an allowlisted send as a send", () => {
    const text = answerFlow("Prepare a USDC send to an allowlisted recipient.", {
      vault: null,
      ownerConnected: false,
      grant: {
        agent: "0xc3b183D5e4436C20282650348BE2D6c94c4142dc",
        maxPerTx: "10000",
        expiry: 1792040766,
        scopes: 1,
        active: true,
      },
    });
    expect(text).toContain("## Send");
    expect(text).toContain("0xc3b183D5e4436C20282650348BE2D6c94c4142dc");
    expect(text).not.toContain("## Allowlist");
  });

  it("reports a reverted over-cap receipt", () => {
    const text = answerFlow("What happens if a send is over the cap?", {
      vault: null,
      ownerConnected: false,
      rail: { block: "1", overCapStatus: "reverted" },
    });
    expect(text).toContain("status on this read: reverted");
    expect(text).toContain("does not move USDC");
  });
});
