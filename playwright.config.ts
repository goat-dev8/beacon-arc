import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: "https://beacon-arc-one.vercel.app",
    // W7: the sandbox cannot download Playwright's bundled Chromium
    // (download host is egress-blocked), so a system Chromium is used when
    // PLAYWRIGHT_CHROMIUM_EXECUTABLE is set. Unset => default browser.
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
            args: ["--no-sandbox"],
          },
        }
      : {}),
    // W7: outbound traffic in this sandbox goes through an egress proxy;
    // Chromium does not read proxy env vars, so pass it explicitly.
    // The proxy accepts unauthenticated CONNECT; strip any embedded
    // credentials because Chromium mishandles them.
    ...((() => {
      const raw = process.env.HTTPS_PROXY || process.env.https_proxy || "";
      const m = raw.match(/^https?:\/\/([^:/@]+)(:\d+)?/);
      return m ? { proxy: { server: `http://${m[1]}${m[2] || ""}` } } : {};
    })()),
  },
});
