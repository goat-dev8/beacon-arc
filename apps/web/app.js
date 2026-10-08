const api = window.BEACON_API;
const owner = window.BEACON_OWNER;
const vaultEl = document.querySelector("#vault");
const capsEl = document.querySelector("#caps");

function row(label, value) {
  return `<div class="row"><span class="k">${label}</span><span class="v">${value}</span></div>`;
}

function money(base) {
  const n = BigInt(base);
  const whole = n / 1000000n;
  const frac = (n % 1000000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `$${frac ? `${whole}.${frac}` : `${whole}.00`}`;
}

async function load() {
  try {
    const response = await fetch(`${api}/v1/vault/${owner}`);
    if (response.status === 404) {
      vaultEl.innerHTML = `<p class="state">No vault for this owner yet.</p>`;
      return;
    }
    if (!response.ok) throw new Error("Vault request failed");
    const vault = await response.json();
    vaultEl.innerHTML = `
      <p class="amount">${money(vault.usdcBalance)} USDC in the vault</p>
      <p>Policy allows ${money(vault.maxPerTx)} per payment.</p>
      <details>
        <summary>Advanced</summary>
        ${row("Vault", vault.vault)}
        ${row("Nonce", vault.nonce)}
        ${row("Policy version", vault.policyVersion)}
        ${row("Window spent", vault.windowSpent)}
      </details>`;
    const items = ["swap", "cctp", "privacy", "pq", "x402", "erc8004"];
    capsEl.innerHTML = `<p>What is executable</p>` + items.map((name) => {
      const item = vault.capabilities[name];
      const klass = item.executable ? "pill" : "pill off";
      const label = item.executable ? "live" : "unavailable";
      return `<p><span class="${klass}">${label}</span> ${name}. ${item.reason || ""}</p>`;
    }).join("");
  } catch {
    vaultEl.innerHTML = `<p class="state">Arc did not answer. Nothing here is a cached balance.</p>`;
  }
}

load();
