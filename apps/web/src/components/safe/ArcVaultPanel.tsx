import { useQuery } from "@tanstack/react-query";
import { fetchArcCapabilities, fetchArcVault, type ArcCapability } from "@/lib/arcApi";
import { CONTRACTS } from "@/lib/chain";

const FLAGS = ["send", "swap", "cctp", "privacy", "pq", "x402", "erc8004"] as const;

function flagLabel(_key: (typeof FLAGS)[number], cap: ArcCapability | undefined) {
  if (!cap) return "unknown";
  return cap.executable ? "live" : "off";
}

export function ArcVaultPanel({ owner }: { owner: string | null }) {
  const caps = useQuery({
    queryKey: ["arc-capabilities"],
    queryFn: fetchArcCapabilities,
  });
  const vault = useQuery({
    queryKey: ["arc-vault", owner],
    queryFn: () => fetchArcVault(owner!),
    enabled: Boolean(owner),
    retry: false,
  });

  return (
    <section className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-card)] p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--p-accent-text)]">
        Live Arc
      </p>
      <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--p-fg)]">
        {vault.data?.summary ??
          (vault.isError
            ? "No vault for this wallet"
            : owner
              ? "Reading the vault…"
              : "Connect to read your vault")}
      </h2>
      {vault.isError && (
        <p className="mt-2 text-sm text-[var(--p-muted)]">
          This address has no vault yet. The deployed vault is {CONTRACTS.vault}.
        </p>
      )}
      {vault.data && (
        <dl className="mt-4 grid gap-2 font-mono text-xs text-[var(--p-muted)] sm:grid-cols-2">
          <div>Vault {vault.data.vault}</div>
          <div>Policy v{vault.data.policyVersion}</div>
          <div>Max / tx {vault.data.maxPerTx}</div>
          <div>Nonce {vault.data.nonce}</div>
        </dl>
      )}
      <ul className="mt-4 flex flex-wrap gap-2">
        {FLAGS.map((key) => {
          const cap = caps.data?.[key];
          return (
            <li
              key={key}
              title={cap?.reason}
              className="rounded-full border border-[var(--p-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--p-muted)]"
            >
              {key} · {flagLabel(key, cap)}
            </li>
          );
        })}
      </ul>
      {caps.isError && (
        <p className="mt-3 text-sm text-[var(--p-muted)]">Capabilities could not be read from the API.</p>
      )}
    </section>
  );
}
