import { describe, expect, it } from "vitest";
import { answerFlow } from "./arcApi";

describe("answerFlow", () => {
  it("quotes a swap from the router and refuses a trade when the vault has no swap selector", () => {
    const text = answerFlow("Can I swap USDC?", {
      vault: null,
      ownerConnected: true,
      quote: { status: "quoted", amountOut: "8276" },
      rail: {
        block: "25470000",
        routerBytes: 21902,
        vaultBytes: 5047,
        vaultHasSend: true,
        vaultHasSwap: false,
      },
    });
    expect(text).toContain("8276 EURC base units");
    expect(text).toContain("21902 bytes");
    expect(text).toContain("contains executeSend");
    expect(text).toContain("does not contain swapExactTokensForTokens");
    expect(text).toContain("will not send a swap");
    expect(text).not.toContain("## Allowlist");
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
