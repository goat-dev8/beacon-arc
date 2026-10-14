import { parseUnits } from "viem";

export const DEFAULT_RECIPIENT = "0xCb2E45A4c3703cd9C73DF09C8b945d5295Fa3Edd";

export type AgentAsk =
  | { kind: "send"; amount: string; recipient: string }
  | { kind: "swap"; amount: string }
  | { kind: "revert" };

function units(text: string): string {
  return parseUnits(text, 6).toString();
}

/** Turn a chat line into an agent task. Read-only topics (bridge, privacy) stay null. */
export function parseAgentAsk(text: string): AgentAsk | null {
  const trimmed = text.trim();
  if (/bridge|cctp|privacy|private/i.test(trimmed)) return null;
  if (/over[- ]?cap|over the cap|above the cap|more than the cap/i.test(trimmed)) return { kind: "revert" };
  const send = trimmed.match(/send\s+(\d+(?:\.\d{1,6})?)\s*(?:usdc)?(?:\s+to\s+(0x[a-fA-F0-9]{40}))?/i);
  if (send) {
    return { kind: "send", amount: units(send[1]), recipient: send[2] ?? DEFAULT_RECIPIENT };
  }
  if (/prepare a usdc send/i.test(trimmed)) {
    return { kind: "send", amount: "1000", recipient: DEFAULT_RECIPIENT };
  }
  const swap = trimmed.match(/swap\s+(\d+(?:\.\d{1,6})?)/i);
  if (swap) return { kind: "swap", amount: units(swap[1]) };
  if (/\bswap\b/i.test(trimmed)) return { kind: "swap", amount: "1000" };
  return null;
}
