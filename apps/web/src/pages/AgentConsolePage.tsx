import { useState } from "react";
import { Link } from "react-router-dom";
import { AgentTaskPanel } from "@/components/AgentTaskPanel";
import { requestSessionChallenge, verifySession } from "@/lib/arcApi";
import { useProductWallet } from "@/lib/productWallet";
import { signPersonalMessage } from "@/lib/wallet";
import { V2_CONTRACTS } from "@/lib/chain";

const OWNER = "0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034";
const AGENT = "0xc3b183D5e4436C20282650348BE2D6c94c4142dc";

export function AgentConsolePage() {
  const { wallet, connect, connecting } = useProductWallet();
  const [session, setSession] = useState<string | null>(null);
  const role = !wallet
    ? "visitor"
    : wallet.toLowerCase() === OWNER.toLowerCase()
      ? "owner"
      : wallet.toLowerCase() === AGENT.toLowerCase()
        ? "agent"
        : "visitor";

  async function ensureSession() {
    if (session) return session;
    if (!wallet) throw new Error("Connect the vault owner wallet first. That login does not move USDC.");
    const challenge = await requestSessionChallenge(wallet);
    const signature = await signPersonalMessage(challenge.message);
    const verified = await verifySession(wallet, signature);
    setSession(verified.token);
    return verified.token;
  }

  return (
    <div className="min-h-full bg-[var(--p-bg)] px-4 py-6 text-[var(--p-fg)] md:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-accent-text)]">Agent spends</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Agent console</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--p-muted)]">
        The granted agent signs each spend on vault {V2_CONTRACTS.vault.slice(0, 6)}…{V2_CONTRACTS.vault.slice(-4)}.
        You confirm. The executor only relays. Every spend ends at a receipt.
      </p>
      {!wallet && (
        <button className="mt-4 rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#062116]" type="button" disabled={connecting} onClick={() => void connect()}>
          Connect the owner wallet
        </button>
      )}
      <div className="mt-4">
        <AgentTaskPanel role={role} session={session} ensureSession={ensureSession} />
      </div>
      <p className="mt-4 text-sm text-[var(--p-muted)]">
        Limits and the allowlist are set on the <Link className="underline" to="/flow/vault">vault page</Link>.
        A bridge stays off: Arc rejects a burn that a contract starts. Privacy is not on mainnet.
      </p>
    </div>
  );
}
