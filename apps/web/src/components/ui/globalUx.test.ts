import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createToastBus } from "../../lib/toastBus.ts";
import { isChunkLoadError } from "../../lib/chunkLoad.ts";

describe("createToastBus", () => {
  it("delivers emitted toasts to subscribers with incrementing ids", () => {
    const bus = createToastBus();
    const seen: Array<{ id: number; kind: string; title: string }> = [];
    bus.subscribe((item) => seen.push(item));

    const id1 = bus.success("Paid", "0.01 USDC sent");
    const id2 = bus.error("Failed");

    assert.equal(seen.length, 2);
    assert.equal(seen[0]!.id, id1);
    assert.equal(seen[0]!.kind, "success");
    assert.equal(seen[0]!.title, "Paid");
    assert.equal(seen[1]!.id, id2);
    assert.ok(id2 > id1);
  });

  it("supports all three kinds and optional detail", () => {
    const bus = createToastBus();
    const kinds: string[] = [];
    bus.subscribe((item) => kinds.push(item.kind));
    bus.success("a");
    bus.error("b", "detail here");
    bus.info("c");
    assert.deepEqual(kinds, ["success", "error", "info"]);
  });

  it("unsubscribe stops delivery", () => {
    const bus = createToastBus();
    let count = 0;
    const unsub = bus.subscribe(() => count++);
    bus.info("one");
    unsub();
    bus.info("two");
    assert.equal(count, 1);
  });

  it("fans out to multiple subscribers", () => {
    const bus = createToastBus();
    let a = 0;
    let b = 0;
    bus.subscribe(() => a++);
    bus.subscribe(() => b++);
    bus.success("x");
    assert.equal(a, 1);
    assert.equal(b, 1);
  });
});

describe("isChunkLoadError", () => {
  it("detects dynamic-import chunk failures", () => {
    assert.equal(
      isChunkLoadError(
        new Error("Failed to fetch dynamically imported module: /assets/Flow.js"),
      ),
      true,
    );
    assert.equal(
      isChunkLoadError(new Error("Loading chunk 4 failed.")),
      true,
    );
  });

  it("rejects ordinary render errors", () => {
    assert.equal(isChunkLoadError(new Error("Cannot read properties of undefined")), false);
    assert.equal(isChunkLoadError(null), false);
    assert.equal(isChunkLoadError("plain string"), false);
  });
});
