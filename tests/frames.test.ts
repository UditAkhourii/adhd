import assert from "node:assert/strict";
import test from "node:test";

import { selectFrames } from "../src/frames.ts";

test("selectFrames(1, ...) always includes a wildcard frame", () => {
  for (let i = 0; i < 50; i++) {
    const [frame] = selectFrames(1, true);
    assert.ok(frame.tags.includes("wild"), `expected wildcard frame, got ${frame.id}`);
  }
});

test("selectFrames(n, ...) always includes at least one wildcard frame for n > 1", () => {
  for (let i = 0; i < 50; i++) {
    const picked = selectFrames(4, true);
    assert.ok(picked.some((f) => f.tags.includes("wild")));
    assert.equal(picked.length, 4);
  }
});
