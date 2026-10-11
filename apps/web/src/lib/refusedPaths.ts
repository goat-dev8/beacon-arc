const REFUSED_PREFIXES = [
  "/v1/jobs",
  "/v1/agents/",
  "/v1/tee/",
  "/v1/services",
  "/v1/vault/prepare",
  "/v1/vault/status",
  "/v1/vault/safe-swap",
  "/v1/flow/",
  "/v1/auth/safe-session",
  "/v1/bridge/",
  "/v1/credit/",
  "/v1/receipts/",
  "/v1/security/",
  "/v1/mcp/",
];

export function refusedArcPath(path: string): boolean {
  const bare = path.split("?")[0] ?? path;
  return REFUSED_PREFIXES.some((prefix) => bare === prefix || bare.startsWith(prefix));
}
