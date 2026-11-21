// LLM-as-judge.
//
// We can't ground-truth ideation, so we use a separate critic pass to score
// two outputs (ADHD vs baseline) on the dimensions that matter for *open-ended*
// design work: breadth, novelty, trap detection, actionability, and overall
// usefulness to a builder.
//
// To reduce same-model bias: the judge runs with a system prompt that asks
// for adversarial reading ("be a skeptical staff engineer"), and it sees BOTH
// outputs blinded (labelled A/B in random order per problem) so positional bias
// is balanced across runs.

import { z } from "zod";

import { callLLM, parseJSON } from "../src/llm.js";

const Dimension = z.object({
  a: z.number().min(0).max(10),
  b: z.number().min(0).max(10),
  reason: z.string(),
});

// run-evals.ts treats any winner other than exactly "A" or "B" as a tie, so an
// unvalidated "Output A" would silently turn a win into a tie. Case is the one
// unambiguous variation, so normalise it; anything else must fail loudly.
const Winner = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const t = v.trim().toLowerCase();
  return t === "a" ? "A" : t === "b" ? "B" : t;
}, z.enum(["A", "B", "tie"]));

const VerdictSchema = z.object({
  breadth: Dimension,            // 0-10, range of distinct angles
  novelty: Dimension,            // 0-10, non-obvious-but-viable
  trap_detection: Dimension,     // 0-10, names traps with reasons
  actionability: Dimension,      // 0-10, gives concrete first steps
  builder_usefulness: Dimension, // 0-10, would a builder ship from this?
  overall_winner: Winner,
  one_line_summary: z.string(),
});

export type Verdict = z.infer<typeof VerdictSchema>;

const JUDGE_SYSTEM = `You are a skeptical staff engineer reviewing two ideation outputs (A and B)
for the same problem. Your job is to score them on the dimensions of open-ended
design work, not on prose polish.

You do NOT know which system produced which output. Score on substance only.

Rubric (each dimension 0-10):
- breadth: range of structurally DISTINCT angles. 10 minor variations of one idea = low breadth.
- novelty: how many ideas are non-obvious-but-viable. The obvious textbook answer is NOT novel.
- trap_detection: does it name ideas that look good but are traps, with reasons?
- actionability: does the top recommendation have a sketch, named risk, and first concrete step?
- builder_usefulness: if you were the engineer who had to ship, which is more useful to you?

Then declare overall_winner: "A", "B", or "tie".
Output JSON only. No prose preamble.`;

export async function judge(
  problem: string,
  outputA: string,
  outputB: string,
  model?: string,
): Promise<Verdict> {
  const userPrompt = `PROBLEM:
${problem}

OUTPUT A:
${outputA}

---

OUTPUT B:
${outputB}

---

Score both on the rubric. Output JSON of shape:
{
  "breadth": {"a": 0-10, "b": 0-10, "reason": "..."},
  "novelty": {"a": 0-10, "b": 0-10, "reason": "..."},
  "trap_detection": {"a": 0-10, "b": 0-10, "reason": "..."},
  "actionability": {"a": 0-10, "b": 0-10, "reason": "..."},
  "builder_usefulness": {"a": 0-10, "b": 0-10, "reason": "..."},
  "overall_winner": "A" | "B" | "tie",
  "one_line_summary": "..."
}`;

  const raw = await callLLM({ model, systemPrompt: JUDGE_SYSTEM, userPrompt });
  return parseVerdict(raw);
}

// Every engine call site validates model output with a schema; the judge has to
// as well, or a malformed verdict lands in EVALS.md as NaN or a phantom tie.
export function parseVerdict(raw: string): Verdict {
  return VerdictSchema.parse(parseJSON<unknown>(raw));
}
