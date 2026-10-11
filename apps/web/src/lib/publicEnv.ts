/** Public hosted API. Safe in the SPA. Never put executor or deployer keys here. */
export const HOSTED_API_URL = "https://beacon-arc-api.onrender.com";

export function apiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (import.meta.env.PROD) return HOSTED_API_URL;
  return "";
}
