import { expect, test } from "@playwright/test";

test("the vault desk is the USDC journey", async ({ page }) => {
  await page.goto("/flow/desk");
  await expect(page.getByRole("heading", { name: "Your USDC vault" })).toBeVisible();
  await expect(page.getByText("Escrow AI jobs")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Proof history" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Task the agent" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity" })).toHaveCount(0);
});

test("the landing does not describe a compute job", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Preparing a send")).toBeVisible();
  await expect(page.getByText("Preparing a job")).toHaveCount(0);
});

test("agents initialize without a bearer is denied", async ({ page }) => {
  await page.goto("/flow/mcp");
  await expect(page.getByRole("heading", { name: "Agent access" })).toBeVisible();
  await page.getByRole("button", { name: "Call initialize with no bearer" }).click();
  await expect(page.getByText("Bearer required.")).toBeVisible({ timeout: 30_000 });
});

test("a non-hash verify url does not show a job proof", async ({ page }) => {
  await page.goto("/verify/not-a-job");
  await expect(page.getByRole("heading", { name: "That doesn't look like a receipt" })).toBeVisible();
  await expect(page.getByText("Job proof")).toHaveCount(0);
  await expect(page.getByText("Escrow locked")).toHaveCount(0);
});

test("the recorded send verifies as a USDC receipt", async ({ page }) => {
  await page.goto("/verify/0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a");
  await expect(page.getByRole("heading", { name: "USDC receipt" })).toBeVisible();
  await expect(page.getByText("0.01 USDC · 10000 base units")).toBeVisible();
});

test("safe is the same vault, not a TEE unlock", async ({ page }) => {
  await page.goto("/flow/security");
  await expect(page.getByRole("heading", { name: "Your USDC vault" })).toBeVisible();
  await expect(page.getByText("Unlock Beacon Agent")).toHaveCount(0);
});

// ---- W7 rescue smoke tests ----
// Target is PRODUCTION (https://beacon-arc-one.vercel.app via baseURL), no wallet.
// These validate what judges see today. Generous timeouts: the pages read live
// Arc state through the Render API, which can take tens of seconds.

const RECEIPT_ID =
  "0x429b11d6083c4a323373fb54ed596d1c42ee6c8fef1b132f57a079381b13ad9a";
const PROOF_CONTRACTS = [
  "0x8901AAa87035b80c70B1636697DaE899Ef67c6fe", // live BeaconUsdcVault V2
  "0x71Ef5450F5eE6E8A888c1E7b7f2e89bCCd4fFAB6", // first BeaconUsdcVault
  "0x3db8750EE3a397b5A8A4e1842Bfb69f511342C6b", // BeaconVaultFactory
  "0xB4483128Bf95aa63621cB9EcA7f5d22a0d546b6C", // BeaconReceiptRegistry
];
const PROOF_TXS = [
  "0xa38fb4dc01fd13be69f88bcb36fa3e6021faf33f3461b66f1da4e9ceba8a94ab", // allow path
  "0xe53e8adf0bf2a3bbabce37ddb9f0267947e68a1a281aa473607ee7d2db663f83", // OverCap money shot
];

test("homepage shows the Live on Arc mainnet proof section", async ({ page }) => {
  // EXPECTED-TO-FAIL-ON-PROD until the rescue deploy lands on Vercel.
  // This asserts the NEW LiveProofSection (rescue/p0). Passing on prod means
  // the deploy is live; failing means the old deploy is still up.
  await page.goto("/");
  const section = page.locator("#live-proof");
  await expect(section.getByText("Live on Arc mainnet")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    section.getByRole("heading", { name: "Proof, not promises." }),
  ).toBeVisible();
  const hrefs = await section
    .locator("a[href]")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(hrefs.length).toBeGreaterThanOrEqual(7);
  for (const addr of PROOF_CONTRACTS) {
    expect(
      hrefs.some((h) => h.toLowerCase().includes(addr.toLowerCase())),
      `proof section links contract ${addr}`,
    ).toBe(true);
  }
  for (const hash of PROOF_TXS) {
    expect(
      hrefs.some((h) => h.toLowerCase().includes(hash.toLowerCase())),
      `proof section links tx ${hash}`,
    ).toBe(true);
  }
  expect(
    hrefs.some((h) => h.includes(`/verify/${RECEIPT_ID}`)),
    "proof section links the receipt",
  ).toBe(true);
});

test("the verify receipt links out to the Arc explorer", async ({ page }) => {
  await page.goto(`/verify/${RECEIPT_ID}`);
  await expect(page.getByRole("heading", { name: "USDC receipt" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("0.01 USDC · 10000 base units")).toBeVisible();
  const explorerLinks = page.locator('a[href*="explorer.arc.io"]');
  await expect(explorerLinks.first()).toBeVisible({ timeout: 30_000 });
  expect(await explorerLinks.count()).toBeGreaterThanOrEqual(1);
});

test("the vault journey loads without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto("/flow/vault");
  await expect(page.getByRole("heading", { name: "Your USDC vault" })).toBeVisible({
    timeout: 60_000,
  });
  // Let lazy chain reads settle before judging the console.
  await page.waitForTimeout(5_000);
  expect(errors, `console errors on /flow/vault:\n${errors.join("\n")}`).toEqual(
    [],
  );
});

test("the agent console offers a real send, not a dead button", async ({ page }) => {
  await page.goto("/flow/agent");
  await expect(page.getByRole("heading", { name: "Agent console" })).toBeVisible({
    timeout: 60_000,
  });
  const send = page.getByRole("button", { name: "Task the agent to send" });
  const missing = page.getByText("AGENT_PRIVATE_KEY is missing");
  await expect(send.or(missing)).toBeVisible({ timeout: 60_000 });
  if (await send.isVisible()) await expect(send).toBeEnabled();
  await expect(page.getByText("Uniswap V2 read")).toHaveCount(0);
});

test("the vault page does not offer a dead swap", async ({ page }) => {
  await page.goto("/flow/vault");
  await expect(page.getByRole("heading", { name: "Proof history" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: /swaps stay off/i })).toHaveCount(0);
  await expect(page.getByText("Uniswap V2 read")).toHaveCount(0);
});
