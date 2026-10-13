import { useState } from "react";
import { parseUnits } from "viem";
import {
  confirmAgentSend,
  confirmAgentSwap,
  fetchAgentStatus,
  previewAgentSend,
  previewAgentSwap,
  type AgentTaskResult,
} from "@/lib/arcApi";

const KNOWN_AGENT = "0xc3b183D5e4436C20282650348BE2D6c94c4142dc";

function baseUnits(text: string): string | null {
  const cleaned = text.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(cleaned)) return null;
  return parseUnits(cleaned, 6).toString();
}

function Fields({ result }: { result: AgentTaskResult }) {
  const rows = [
    ["Agent", result.action.agent],
    ["Recipient", result.action.recipient],
    ["Amount (base units)", result.action.amount],
    ["Class", String(result.action.actionClass)],
    ["Nonce", result.action.nonce],
    ["Deadline", result.action.deadline],
    ["Policy version", result.action.policyVersion],
    ["Minimum out", result.action.amountOutMin],
  ];
  return (
    <dl className="mt-3 grid gap-1 font-mono text-[11px] text-[var(--p-muted)]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <dt>{k}</dt>
          <dd className="truncate text-[var(--p-fg)]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AgentTaskPanel({
  role,
  session,
  ensureSession,
}: {
  role: "owner" | "agent" | "visitor";
  session: string | null;
  ensureSession: () => Promise<string>;
}) {
  const [amount, setAmount] = useState("0.001");
  const [recipient, setRecipient] = useState("0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd");
  const [swapAmount, setSwapAmount] = useState("0.005");
  const [preview, setPreview] = useState<AgentTaskResult | null>(null);
  const [swapPreview, setSwapPreview] = useState<AgentTaskResult | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setNote(null);
    try {
      const status = await fetchAgentStatus();
      if (!status.ready) {
        setHidden(true);
        setNote(status.reason);
        return;
      }
      await task();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "The agent task failed. Nothing was shown as success.");
    } finally {
      setBusy(false);
    }
  }

  if (hidden) {
    return (
      <section className="mt-4 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
        <h2 className="font-display text-xl">Task the agent</h2>
        <p className="mt-2 text-sm text-[var(--p-muted)]">{note}</p>
      </section>
    );
  }

  const ownerBlocked = role !== "owner";
  const why = role === "agent"
    ? `You are the granted agent. Sign the send below with this wallet. The server task is for the owner.`
    : role === "visitor"
      ? `Only the vault owner can task the agent ${KNOWN_AGENT.slice(0, 6)}…. Connect that owner wallet.`
      : "You set the limits. The agent signs each spend. You do not sign the payment.";

  return (
    <section className="mt-4 rounded-2xl border border-[var(--p-accent)]/40 bg-[var(--p-card)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--p-accent-text)]">Real transaction — dust amount</p>
      <h2 className="mt-1 font-display text-xl">Task the agent</h2>
      <p className="mt-2 text-sm text-[var(--p-muted)]">
        This spends from the V2 vault 0x8901…c6fe. The V1 vault stays send-only. {why}
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="block text-sm text-[var(--p-muted)]">
            Send amount, USDC
            <input className="mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-sm" value={amount} onChange={(e) => { setAmount(e.target.value); setPreview(null); }} />
          </label>
          <label className="mt-3 block text-sm text-[var(--p-muted)]">
            Recipient
            <input className="mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-sm" value={recipient} onChange={(e) => { setRecipient(e.target.value); setPreview(null); }} />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#062116] disabled:opacity-50" disabled={busy} onClick={() => void run(async () => {
              const units = baseUnits(amount);
              if (!units) throw new Error("Enter a USDC amount with at most 6 decimals.");
              setPreview(await previewAgentSend(recipient, units));
            })}>
              Show the exact send
            </button>
            <button type="button" className="rounded-full border border-[var(--p-border)] px-4 py-2 text-sm disabled:opacity-50" disabled={busy || ownerBlocked} onClick={() => void run(async () => {
              const token = session ?? await ensureSession();
              const done = await confirmAgentSend(token, recipient, "10001", true);
              setPreview(done);
              setNote("Over-cap attempt broadcast. The receipt must be a revert. No USDC moves.");
            })}>
              Watch an over-cap revert
            </button>
            <button type="button" className="rounded-full border border-[var(--p-border)] px-4 py-2 text-sm disabled:opacity-50" disabled={busy || !preview || ownerBlocked} onClick={() => void run(async () => {
              const token = session ?? await ensureSession();
              const units = baseUnits(amount);
              if (!units || !preview) return;
              const done = await confirmAgentSend(token, recipient, units);
              setPreview(done);
              setNote(done.txHash ? `Submitted. Arc tx ${done.txHash}` : "No transaction hash. Beacon will not show success.");
            })}>
              Task the agent to send
            </button>
          </div>
          {ownerBlocked && <p className="mt-2 text-xs text-[var(--p-muted)]">{why}</p>}
          {preview && <Fields result={preview} />}
          {preview?.txHash && (
            <p className="mt-2 text-sm">
              <a className="underline" href={preview.explorer} target="_blank" rel="noreferrer">Explorer transaction</a>
              {" · "}
              <a className="underline" href={preview.verifyUrl}>Receipt</a>
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm text-[var(--p-muted)]">
            Swap amount, USDC to EURC
            <input className="mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-sm" value={swapAmount} onChange={(e) => { setSwapAmount(e.target.value); setSwapPreview(null); }} />
          </label>
          <p className="mt-2 text-xs text-[var(--p-muted)]">Output can only land back in the V2 vault. The floor is 1% under the live v3 quote.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#062116] disabled:opacity-50" disabled={busy} onClick={() => void run(async () => {
              const units = baseUnits(swapAmount);
              if (!units) throw new Error("Enter a USDC amount with at most 6 decimals.");
              setSwapPreview(await previewAgentSwap(units));
            })}>
              Show the exact swap
            </button>
            <button type="button" className="rounded-full border border-[var(--p-border)] px-4 py-2 text-sm disabled:opacity-50" disabled={busy || !swapPreview || ownerBlocked} onClick={() => void run(async () => {
              const token = session ?? await ensureSession();
              const units = baseUnits(swapAmount);
              if (!units) return;
              const done = await confirmAgentSwap(token, units);
              setSwapPreview(done);
              setNote(done.txHash ? `Swap submitted. Arc tx ${done.txHash}` : "No transaction hash. Beacon will not show success.");
            })}>
              Task the agent to swap
            </button>
          </div>
          {swapPreview?.quote && (
            <p className="mt-2 text-xs text-[var(--p-muted)]">
              Quote {swapPreview.quote.amountOut} EURC base units. Floor {swapPreview.quote.amountOutMin}. Venue {swapPreview.quote.venue}.
            </p>
          )}
          {swapPreview && <Fields result={swapPreview} />}
          {swapPreview?.txHash && (
            <p className="mt-2 text-sm">
              <a className="underline" href={swapPreview.explorer} target="_blank" rel="noreferrer">Explorer transaction</a>
            </p>
          )}
        </div>
      </div>
      {note && <p className="mt-3 text-sm">{note}</p>}
    </section>
  );
}
