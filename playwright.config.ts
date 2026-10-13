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
    // W7: outbound traffic in this sandbox goes through an egress proxy that
    // Chromium cannot use directly. A local relay (node /tmp/relay-proxy.mjs
    // on 127.0.0.1:18080) forwards to it. Set PLAYWRIGHT_PROXY_SERVER to use
    // a proxy; unset => direct connection (normal CI/dev behavior).
    ...(process.env.PLAYWRIGHT_PROXY_SERVER
      ? { proxy: { server: process.env.PLAYWRIGHT_PROXY_SERVER } }
      : {}),
    // W7: the sandbox egress proxy MITMs TLS with a private CA; the test
    // browser must ignore cert errors (curl/node trust the system store).
    // Only applied when the sandbox proxy env is in use.
    ...(process.env.PLAYWRIGHT_PROXY_SERVER
      ? { ignoreHTTPSErrors: true }
      : {}),
  },
});
