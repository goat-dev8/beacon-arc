import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import {
  confirmAgentSend,
  confirmAgentSwap,
  fetchAgentStatus,
  previewAgentSend,
  previewAgentSwap,
  type AgentTaskResult,
} from "@/lib/arcApi";

const OWNER = "0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034";
const ALLOWED = "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd";

function units(text: string): string | null {
  const cleaned = text.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(cleaned)) return null;
  return parseUnits(cleaned, 6).toString();
}

function Fields({ result }: { result: AgentTaskResult }) {
  const a = result.action;
  const rows: Array<[string, string]> = [
    ["Agent", a.agent],
    ["Recipient", a.recipient],
    ["Amount, base units", a.amount],
    ["Class", String(a.actionClass)],
    ["Nonce", a.nonce],
    ["Deadline", a.deadline],
    ["Policy version", a.policyVersion],
    ["Minimum out", a.amountOutMin],
  ];
  return (
    <dl className="mt-3 grid gap-1 font-mono text-[11px] text-[var(--p-muted)]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt>{label}</dt>
          <dd className="max-w-[16rem] truncate text-[var(--p-fg)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const go = "rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#062116] disabled:opacity-60";

export function AgentTaskPanel({
  role,
  session,
  ensureSession,
}: {
  role: "owner" | "agent" | "visitor";
  session: string | null;
  ensureSession: () => Promise<string>;
}) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [statusReason, setStatusReason] = useState<string | null>(null);
  const [amount, setAmount] = useState("0.001");
  const [recipient, setRecipient] = useState(ALLOWED);
  const [swapAmount, setSwapAmount] = useState("0.005");
  const [sendPreview, setSendPreview] = useState<AgentTaskResult | null>(null);
  const [swapPreview, setSwapPreview] = useState<AgentTaskResult | null>(null);
  const [revertArmed, setRevertArmed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetchAgentStatus()
      .then((status) => {
        if (!live) return;
        setReady(status.ready);
        setStatusReason(status.reason);
      })
      .catch((error: unknown) => {
        if (!live) return;
        setReady(false);
        setStatusReason(error instanceof Error ? error.message : "The agent status could not be read.");
      });
    return () => {
      live = false;
    };
  }, []);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setNote(null);
    try {
      await task();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "The task failed. Nothing was shown as success.");
    } finally {
      setBusy(false);
    }
  }

  if (ready === null) {
    return <p className="mt-4 text-sm text-[var(--p-muted)]">Reading whether the agent key is on the server…</p>;
  }

  if (!ready) {
    return (
      <section className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-5">
        <h2 className="font-display text-xl">Agent console</h2>
        <p className="mt-2 text-sm text-[var(--p-muted)]">
          AGENT_PRIVATE_KEY is missing on the API server. The owner adds that name in the Render dashboard for beacon-arc-api.
          Until then this console cannot sign, and no button is offered. {statusReason}
        </p>
      </section>
    );
  }

  const ownerHint = role === "owner"
    ? "You are the owner. The first click shows the exact action. The second click asks you to sign in, then broadcasts."
    : `Connect the vault owner ${OWNER.slice(0, 6)}…${OWNER.slice(-4)} before the second click. The first click is a preview and signs nothing.`;

  return (
    <section className="rounded-2xl border border-[var(--p-accent)]/40 bg-[var(--p-card)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--p-accent-text)]">Real transaction — dust amount</p>
      <h2 className="mt-1 font-display text-xl">Task the agent</h2>
      <p className="mt-2 text-sm text-[var(--p-muted)]">
        One vault, {`0x8901…c6fe`}. You set the limits. The agent signs. Confirming broadcasts a real Arc transaction. {ownerHint}
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="block text-sm text-[var(--p-muted)]">
            Send amount, USDC
            <input className="mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-sm" value={amount} onChange={(e) => { setAmount(e.target.value); setSendPreview(null); }} />
          </label>
          <label className="mt-3 block text-sm text-[var(--p-muted)]">
            Recipient
            <input className="mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-sm" value={recipient} onChange={(e) => { setRecipient(e.target.value); setSendPreview(null); }} />
          </label>
          <button
            type="button"
            className={`${go} mt-3`}
            disabled={busy}
            onClick={() => void run(async () => {
              const value = units(amount);
              if (!value) throw new Error("Enter a USDC amount with at most 6 decimals.");
              if (!sendPreview) {
                setSendPreview(await previewAgentSend(recipient, value));
                return;
              }
              if (role !== "owner") throw new Error(`Connect the vault owner ${OWNER.slice(0, 6)}…${OWNER.slice(-4)} to confirm. The fields above are the exact action. Nothing was signed.`);
              const token = session ?? await ensureSession();
              const done = await confirmAgentSend(token, recipient, value);
              setSendPreview(done);
              if (!done.txHash) throw new Error("No transaction hash. Beacon will not show success.");
              setNote(`Send submitted. Arc tx ${done.txHash}`);
            })}
          >
            {sendPreview?.txHash ? "Send submitted" : sendPreview ? "Confirm send — real transaction" : "Task the agent to send"}
          </button>
          <p className="mt-2 text-xs text-[var(--p-muted)]">
            {sendPreview
              ? "The fields below are the exact action. Confirm broadcasts it."
              : "This button is on. The first click shows the exact action. The second click sends it."}
          </p>
          {sendPreview && <Fields result={sendPreview} />}
          {sendPreview?.txHash && (
            <p className="mt-2 text-sm">
              <a className="underline" href={sendPreview.explorer} target="_blank" rel="noreferrer">Explorer</a>
              {" · "}
              <a className="underline" href={sendPreview.verifyUrl}>Receipt</a>
            </p>
          )}
          <button
            type="button"
            className="mt-4 block text-sm underline"
            disabled={busy}
            onClick={() => void run(async () => {
              if (!revertArmed) {
                setRevertArmed(true);
                setNote("10001 base units is above the 10000 cap. Confirming broadcasts a transaction that must revert OverCap. No USDC moves.");
                return;
              }
              if (role !== "owner") throw new Error(`Connect the vault owner ${OWNER.slice(0, 6)}…${OWNER.slice(-4)} to watch the revert. Nothing was signed.`);
              const token = session ?? await ensureSession();
              const done = await confirmAgentSend(token, recipient, "10001", true);
              setSendPreview(done);
              setNote(done.txHash ? `Over-cap broadcast. Open the explorer receipt and confirm status reverted. ${done.txHash}` : "No hash. Not shown as success.");
            })}
          >
            {revertArmed ? "Confirm over-cap revert" : "Watch an over-cap revert"}
          </button>
        </div>
        <div>
          <label className="block text-sm text-[var(--p-muted)]">
            Swap amount, USDC to EURC
            <input className="mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2 text-sm" value={swapAmount} onChange={(e) => { setSwapAmount(e.target.value); setSwapPreview(null); }} />
          </label>
          <p className="mt-2 text-xs text-[var(--p-muted)]">Output can only return to this vault. The floor is 1% under the live v3 quote.</p>
          <button
            type="button"
            className={`${go} mt-3`}
            disabled={busy}
            onClick={() => void run(async () => {
              const value = units(swapAmount);
              if (!value) throw new Error("Enter a USDC amount with at most 6 decimals.");
              if (!swapPreview) {
                setSwapPreview(await previewAgentSwap(value));
                return;
              }
              if (role !== "owner") throw new Error(`Connect the vault owner ${OWNER.slice(0, 6)}…${OWNER.slice(-4)} to confirm. The quote above is the exact action. Nothing was signed.`);
              const token = session ?? await ensureSession();
              const done = await confirmAgentSwap(token, value);
              setSwapPreview(done);
              if (!done.txHash) throw new Error("No transaction hash. Beacon will not show success.");
              setNote(`Swap submitted. Arc tx ${done.txHash}`);
            })}
          >
            {swapPreview?.txHash ? "Swap submitted" : swapPreview ? "Confirm swap — real transaction" : "Task the agent to swap"}
          </button>
          <p className="mt-2 text-xs text-[var(--p-muted)]">
            {swapPreview
              ? "The quote and the floor are on screen. Confirm broadcasts the swap."
              : "This button is on. The first click shows the quote and the exact action. The second click swaps."}
          </p>
          {swapPreview?.quote && (
            <p className="mt-2 text-xs text-[var(--p-muted)]">
              Quote {swapPreview.quote.amountOut} EURC base units. Floor {swapPreview.quote.amountOutMin}. {swapPreview.quote.venue}.
            </p>
          )}
          {swapPreview && <Fields result={swapPreview} />}
          {swapPreview?.txHash && (
            <p className="mt-2 text-sm">
              <a className="underline" href={swapPreview.explorer} target="_blank" rel="noreferrer">Explorer</a>
              {" · "}
              <a className="underline" href={swapPreview.verifyUrl}>Receipt</a>
            </p>
          )}
        </div>
      </div>
      {note && <p className="mt-3 text-sm">{note}</p>}
    </section>
  );
}
