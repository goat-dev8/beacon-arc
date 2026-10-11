import { expect, test } from "@playwright/test";

test("the vault desk is the USDC journey", async ({ page }) => {
  await page.goto("/flow/desk");
  await expect(page.getByRole("heading", { name: "Your USDC vault" })).toBeVisible();
  await expect(page.getByText("Escrow AI jobs")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign and relay the send" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Block recipient" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "8. Activity" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Not an Arc receipt" })).toBeVisible();
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
