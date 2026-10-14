import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { parseAbi, parseUnits, type Address } from "viem";
import { V2_CONTRACTS, CONTRACTS, NETWORK } from "@/lib/chain";
import { useProductWallet } from "@/lib/productWallet";
import { publicClient, shortAddress, writeArcContract } from "@/lib/wallet";

const OWNER = "0xBDfCeE82Bd42FEfA58ee850B3709636a8B6b0034";
const AGENT = "0xc3b183D5e4436C20282650348BE2D6c94c4142dc";
const PAYEE = "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd";

const v2Abi = parseAbi([
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function maxPerTx() view returns (uint256)",
  "function windowLimit() view returns (uint256)",
  "function nonce() view returns (uint256)",
  "function usdc() view returns (address)",
]);
const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const writeAbi = parseAbi([
  "function allowRecipient(address recipient, bool allowed)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

const PROOFS = [
  {
    title: "Allowed send",
    detail: "0.01 USDC. The vault called transfer itself.",
    href: "https://explorer.arc.io/tx/0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab",
  },
  {
    title: "Over-cap refusal",
    detail: "Reverted OverCap. The refusal is on-chain.",
    href: "https://explorer.arc.io/tx/0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83",
  },
  {
    title: "Receipt",
    detail: "0.01 USDC to an independent recipient.",
    href: "/verify/0xcd92f30d2673a3a852345aa832db4409ae37274fd2ab98cf8e8ccc5902c7ac30",
  },
] as const;

function usdc(base: bigint) {
  const whole = base / 1_000_000n;
  const frac = (base % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function VaultJourneyPage() {
  const { wallet, connect, connecting } = useProductWallet();
  const [extra, setExtra] = useState("");
  const [add, setAdd] = useState("0.01");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const state = useQuery({
    queryKey: ["v2-setup", V2_CONTRACTS.vault],
    queryFn: async () => {
      const client = publicClient();
      const vault = V2_CONTRACTS.vault;
      const [owner, paused, maxPerTx, windowLimit, nonce, usdcBalance] = await Promise.all([
        client.readContract({ address: vault, abi: v2Abi, functionName: "owner" }),
        client.readContract({ address: vault, abi: v2Abi, functionName: "paused" }),
        client.readContract({ address: vault, abi: v2Abi, functionName: "maxPerTx" }),
        client.readContract({ address: vault, abi: v2Abi, functionName: "windowLimit" }),
        client.readContract({ address: vault, abi: v2Abi, functionName: "nonce" }),
        client.readContract({ address: CONTRACTS.usdc, abi: erc20Abi, functionName: "balanceOf", args: [vault] }),
      ]);
      return { owner, paused, maxPerTx, windowLimit, nonce, usdcBalance };
    },
  });

  const row = state.data;
  const isOwner = Boolean(wallet && row && wallet.toLowerCase() === row.owner.toLowerCase());
  const validExtra = /^0x[a-fA-F0-9]{40}$/.test(extra.trim());

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setNote(null);
    try {
      await task();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Arc did not confirm that transaction.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-[var(--p-bg)] px-4 py-6 text-[var(--p-fg)] md:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-accent-text)]">Arc · chain {NETWORK.chainId}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Your USDC vault</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--p-muted)]">
        Setup once — you set the limits. Agent spends — within those limits, every spend is signed. You verify — every spend has a receipt.
      </p>

      {!wallet ? (
        <button className="mt-4 rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#062116]" type="button" disabled={connecting} onClick={() => void connect()}>
          Connect wallet
        </button>
      ) : (
        <p className="mt-4 text-sm text-[var(--p-muted)]">
          Connected {shortAddress(wallet)}. {isOwner ? "You are the owner of the live vault." : `The live vault owner is ${shortAddress(OWNER)}. This wallet can read it.`}
        </p>
      )}

      <ol className="mt-4 grid gap-3">
        <li className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-4">
          <h2 className="font-display text-lg">Create</h2>
          <p className="mt-1 text-sm text-[var(--p-muted)]">One vault already exists, so there is no create button. A second create reverts.</p>
          <p className="mt-2 font-mono text-xs">{V2_CONTRACTS.vault}</p>
        </li>
        <li className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-4">
          <h2 className="font-display text-lg">Fund</h2>
          <p className="mt-1 text-sm text-[var(--p-muted)]">
            {row ? `${usdc(row.usdcBalance)} USDC is already in the vault. That is the 6-decimal token balance. Gas is a separate 18-decimal balance and is not added to it.` : "Reading the vault balance…"}
          </p>
        </li>
        <li className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-4">
          <h2 className="font-display text-lg">Spending limits</h2>
          <p className="mt-1 text-sm text-[var(--p-muted)]">
            {row
              ? `Each action can move at most ${usdc(row.maxPerTx)} USDC. The day can move at most ${usdc(row.windowLimit)} USDC. Nonce ${row.nonce.toString()}.${row.paused ? " The vault is paused." : ""}`
              : "Reading the limits…"}
          </p>
        </li>
        <li className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-4">
          <h2 className="font-display text-lg">Agent and recipients</h2>
          <p className="mt-1 text-sm text-[var(--p-muted)]">
            Agent {shortAddress(AGENT)} can sign sends and swaps. {shortAddress(PAYEE)} is already allowed. You do not sign the payment.
          </p>
          <Link className="mt-3 inline-flex rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#062116]" to="/flow/agent">
            Task the agent
          </Link>
        </li>
      </ol>

      <details className="mt-4 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-4">
        <summary className="cursor-pointer text-sm">Add funds or another recipient</summary>
        <p className="mt-2 text-sm text-[var(--p-muted)]">
          {isOwner ? "These are optional. The vault is already funded and the current recipient is already allowed." : "Connect the owner wallet. These actions are the owner's, and the buttons stay off until then."}
        </p>
        {isOwner && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[var(--p-muted)]">
              Add USDC
              <input className="mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2" value={add} onChange={(e) => setAdd(e.target.value)} />
              <button
                className="mt-2 rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#062116]"
                type="button"
                disabled={busy}
                onClick={() => void run(async () => {
                  if (!/^\d+(\.\d{1,6})?$/.test(add.trim())) throw new Error("Enter a USDC amount with at most 6 decimals.");
                  const hash = await writeArcContract({
                    address: CONTRACTS.usdc,
                    abi: writeAbi,
                    functionName: "transfer",
                    args: [V2_CONTRACTS.vault, parseUnits(add.trim(), 6)],
                  });
                  setNote(`Deposit submitted. Arc tx ${hash}`);
                })}
              >
                Add USDC to the vault
              </button>
            </label>
            <label className="text-sm text-[var(--p-muted)]">
              New recipient
              <input className="mt-1 w-full rounded-xl border border-[var(--p-border)] bg-[var(--p-bg)] px-3 py-2" value={extra} placeholder="0x…" onChange={(e) => setExtra(e.target.value)} />
              {extra && !validExtra && <p className="mt-1 text-xs">Enter a full 0x address. The button appears when the address is valid.</p>}
              {validExtra && (
                <button
                  className="mt-2 rounded-full bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#062116]"
                  type="button"
                  disabled={busy}
                  onClick={() => void run(async () => {
                    const hash = await writeArcContract({
                      address: V2_CONTRACTS.vault,
                      abi: writeAbi,
                      functionName: "allowRecipient",
                      args: [extra.trim() as Address, true],
                    });
                    setNote(`Recipient allowed. Arc tx ${hash}`);
                  })}
                >
                  Allow this recipient
                </button>
              )}
            </label>
          </div>
        )}
      </details>

      <section className="mt-4 rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-4">
        <h2 className="font-display text-lg">Proof history</h2>
        <p className="mt-1 text-sm text-[var(--p-muted)]">
          The first vault {shortAddress(CONTRACTS.vault)} is immutable. These links are its receipts. Nothing on this list can be signed again from here.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {PROOFS.map((proof) => (
            <li key={proof.href}>
              <a className="underline" href={proof.href} target={proof.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{proof.title}</a>
              <span className="text-[var(--p-muted)]"> — {proof.detail}</span>
            </li>
          ))}
        </ul>
      </section>
      {note && <p className="mt-3 text-sm">{note}</p>}
      {state.isError && <p className="mt-3 text-sm text-[var(--p-danger)]">The vault could not be read. Nothing below is invented.</p>}
    </div>
  );
}
