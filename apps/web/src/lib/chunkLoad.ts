/**
 * True when the crash is a lazy-chunk load failure — almost always "a new
 * version was just deployed while the page was open". Pure logic, unit-tested.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|loading chunk \d+ failed|failed to fetch/i.test(
    message,
  );
}
