import { describe, expect, it } from "vitest";
import { formatOgDisplay } from "./format";

describe("formatOgDisplay", () => {
  it("appends USDC and never prefixes $", () => {
    expect(formatOgDisplay("0.047771")).toBe("0.047771 USDC");
    expect(formatOgDisplay("0.001 USDC")).toBe("0.001 USDC");
    expect(formatOgDisplay("$0.001")).toBe("0.001 USDC");
  });

  it("treats empty as a dash", () => {
    expect(formatOgDisplay(null)).toBe("—");
    expect(formatOgDisplay("")).toBe("—");
  });
});
