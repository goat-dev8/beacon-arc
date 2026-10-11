import { useState } from "react";
import { Link } from "react-router-dom";
import { apiBase, HOSTED_API_URL } from "@/lib/publicEnv";

const TOOLS = [
  { name: "capabilities", effect: "Read which rails can execute. Does not move USDC." },
  { name: "get_vault", effect: "Read the owner vault from Arc." },
  { name: "prepare_send", effect: "Return the EIP-712 action. The agent must sign it." },
  { name: "submit_signed_send", effect: "Relay the signature. A changed field is rejected." },
  { name: "verify", effect: "Read a receipt from Arc. A missing row is not a receipt." },
];

export function ArcMcpPage() {
  const endpoint = `${apiBase() || HOSTED_API_URL}/mcp`;
  const [check, setCheck] = useState("No bearer has been sent.");
  const [busy, setBusy] = useState(false);

  return (
    <div className="h-full overflow-y-auto bg-[var(--p-bg)] px-4 py-6 text-[var(--p-fg)] md:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-accent-text)]">MCP</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Agent access</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--p-muted)]">
        The bearer authenticates this API. It does not sign a transfer. Jobs, image generation, and bridge quotes are not tools. The live API lists capabilities, get_vault, prepare_send, submit_signed_send, and verify. Revoke without a bearer returns 401.
      </p>

      <section className="mt-6 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
        <h2 className="font-display text-xl">Endpoint</h2>
        <p className="mt-2 break-all font-mono text-sm">{endpoint}</p>
        <p className="mt-3 text-sm text-[var(--p-muted)]">
          Create the bearer on the <Link className="underline" to="/flow/desk">vault page</Link> after the browser session unlock. Revoke it there. The same bearer then gets 401.
        </p>
        <button
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--p-accent)] px-4 py-2.5 text-sm font-semibold text-[#062116] disabled:cursor-not-allowed disabled:bg-[#3a4149] disabled:text-[#f7f8f8] disabled:opacity-100"
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void fetch(endpoint, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
            })
              .then(async (res) => {
                const body = await res.text();
                setCheck(`${res.status} ${body}`);
              })
              .catch((error: unknown) => {
                setCheck(error instanceof Error ? error.message : String(error));
              })
              .finally(() => setBusy(false));
          }}
        >
          Call initialize with no bearer
        </button>
        <p className="mt-3 text-sm text-[var(--p-muted)]">{check}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
        <h2 className="font-display text-xl">Tools</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {TOOLS.map((tool) => (
            <li key={tool.name}>
              <span className="font-mono">{tool.name}</span>
              <span className="text-[var(--p-muted)]"> — {tool.effect}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
