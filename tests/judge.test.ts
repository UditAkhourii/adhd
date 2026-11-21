import assert from "node:assert/strict";
import test from "node:test";

import { parseVerdict } from "../bench/judge.ts";

const dim = { a: 7, b: 5, reason: "r" };
const valid = {
  breadth: dim,
  novelty: dim,
  trap_detection: dim,
  actionability: dim,
  builder_usefulness: dim,
  overall_winner: "A",
  one_line_summary: "A covers more ground.",
};
const raw = (v: object) => JSON.stringify(v);

test("parseVerdict accepts a well-formed verdict", () => {
  assert.deepEqual(parseVerdict(raw(valid)), valid);
});

test("parseVerdict rejects a winner label outside A/B/tie", () => {
  // run-evals scores anything that isn't exactly "A" or "B" as a tie, so an
  // unvalidated "Output A" would silently flip a win into a tie.
  assert.throws(() => parseVerdict(raw({ ...valid, overall_winner: "Output A" })));
});

test("parseVerdict rejects a verdict missing a dimension", () => {
  const { novelty: _omit, ...missing } = valid;
  assert.throws(() => parseVerdict(raw(missing)));
});

test("parseVerdict rejects a non-numeric score", () => {
  assert.throws(() => parseVerdict(raw({ ...valid, breadth: { ...dim, a: "8" } })));
});

test("parseVerdict normalises the case of a valid winner label", () => {
  assert.equal(parseVerdict(raw({ ...valid, overall_winner: "a" })).overall_winner, "A");
  assert.equal(parseVerdict(raw({ ...valid, overall_winner: "Tie" })).overall_winner, "tie");
});
