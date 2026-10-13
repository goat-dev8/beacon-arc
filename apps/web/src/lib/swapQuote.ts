/** Swap-quote shape shared by the API and the read-only UI. */

export type SwapQuote = {
  status: "quoted" | "NO_ROUTE" | "UNAVAILABLE";
  venue?: "uniswap-v3" | "uniswap-v2";
  indicative?: boolean;
  quoter?: string;
  pool?: string;
  fee?: number;
  amountIn: string;
  amountOut?: string;
  executable: boolean;
  reason: string;
};

export type ApiSwapQuoteBody = {
  status?: string;
  venue?: "uniswap-v3" | "uniswap-v2";
  indicative?: boolean;
  quoter?: string;
  pool?: string;
  fee?: number;
  amountIn?: string;
  amountOut?: string;
  reason?: string;
};

/** Normalize one `/v1/quote/swap` response body. Pure — unit-tested. */
export function normalizeApiSwapQuote(body: ApiSwapQuoteBody, amount: string): SwapQuote {
  const status =
    body.status === "quoted" ? "quoted" : body.status === "UNAVAILABLE" ? "UNAVAILABLE" : "NO_ROUTE";
  return {
    status,
    venue: body.venue,
    indicative: body.indicative,
    quoter: body.quoter,
    pool: body.pool,
    fee: body.fee,
    amountIn: body.amountIn ?? amount,
    amountOut: body.amountOut,
    executable: false,
    reason: body.reason ?? "The live vault has no swap function. This quote is not a trade.",
  };
}
