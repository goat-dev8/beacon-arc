/** Format native fee displays for UI (never dump 18 decimals). */
export function formatNativeFeeDisplay(raw: string | number | undefined | null): string {
  if (raw == null || raw === "") return "-";
  const text = String(raw).trim();
  const match = text.match(/^([\d.]+)\s*(.*)$/);
  if (!match) return text;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return text;
  const unit = (match[2] || "USDC").trim() || "USDC";
  let rounded: string;
  if (n >= 100) rounded = n.toFixed(2);
  else if (n >= 1) rounded = n.toFixed(4);
  else rounded = Number(n.toPrecision(4)).toString();
  return `${rounded} ${unit}`;
}

/** Native USDC for UI. Never prefix with `$` — gas units are not a second balance. */
export function formatOgDisplay(raw: string | number | undefined | null): string {
  if (raw == null || raw === "") return "—";
  const text = String(raw).trim();
  if (!text) return "—";
  const stripped = text.replace(/^\$/, "").replace(/\s*(0G|USDC)$/i, "").trim();
  return stripped ? `${stripped} USDC` : "—";
}

/** Compact USDC amounts for cards. */
export function formatTokenAmount(raw: string | number | undefined | null, symbol = ""): string {
  if (raw == null || raw === "") return "-";
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return `${raw}${symbol ? ` ${symbol}` : ""}`;
  let s: string;
  if (n >= 1000) s = n.toFixed(2);
  else if (n >= 1) s = n.toFixed(4);
  else s = Number(n.toPrecision(4)).toString();
  return symbol ? `${s} ${symbol}` : s;
}
