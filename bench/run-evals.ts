#!/usr/bin/env node
// Eval runner. Compares ADHD vs a single-shot baseline across a problem set,
// scores both with an LLM-as-judge, writes EVALS.md with verdicts + aggregates.
//
// Usage:
//   npx tsx bench/run-evals.ts                  # full suite
//   npx tsx bench/run-evals.ts --problem lru-100ms
//   npx tsx bench/run-evals.ts --quick          # only first 2 problems
//
// Order of A/B in the prompt is randomized per problem to balance positional
// bias; the mapping is recorded so aggregates can be computed correctly.

import { readFileSync, writeFileSync } from "node:fs";
import { run } from "../src/index.js";
import { renderText } from "../src/render.js";
import { callLLM } from "../src/llm.js";
import { judge, type Verdict } from "./judge.js";

type Problem = { id: string; category: string; problem: string };

const BASELINE_SYSTEM =
  "You are a thoughtful senior engineer. When asked to ideate on a problem, " +
  "give a useful answer with multiple approaches, tradeoffs, and a recommendation. " +
  "Be substantive but not bloated.";

async function baseline(problem: string): Promise<string> {
  return callLLM({
    systemPrompt: BASELINE_SYSTEM,
    userPrompt: `Ideate on this engineering problem:\n\n${problem}\n\nGive the user a useful answer.`,
  });
}

async function adhd(problem: string): Promise<string> {
  const result = await run({
    problem,
    framesPerRun: 5,
    ideasPerFrame: 6,
    topK: 3,
    concurrency: 4,
    codeMode: true,
    onEvent: () => {},
  });
  // Strip ANSI for the judge — color codes are noise to the model.
  return renderText(result).replace(/\x1b\[[0-9;]*m/g, "");
}

type RowResult = {
  problemId: string;
  category: string;
  problem: string;
  swapped: boolean;            // if true, A=baseline, B=adhd; else A=adhd, B=baseline
  baselineOutput: string;
  adhdOutput: string;
  verdict: Verdict;
};

function getArg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const allProblems: Problem[] = JSON.parse(
    readFileSync(new URL("./problems.json", import.meta.url), "utf8"),
  );

  const onlyId = getArg("--problem");
  const quick = hasFlag("--quick");
  let problems = onlyId ? allProblems.filter((p) => p.id === onlyId) : allProblems;
  if (quick) problems = problems.slice(0, 2);
  // Zero problems would still reach writeReport, which divides by rows.length
  // and overwrites the committed EVALS.md with a table of NaN.
  if (problems.length === 0) {
    console.error(
      `Error: no problems matched${onlyId ? ` --problem "${onlyId}"` : ""}. ` +
        `Known ids: ${allProblems.map((p) => p.id).join(", ")}`,
    );
    process.exit(1);
  }

  console.error(`▸ running ${problems.length} eval(s)`);

  const rows: RowResult[] = [];
  for (const p of problems) {
    console.error(`\n— ${p.id} (${p.category})`);

    console.error("  · generating baseline…");
    const baselineOutput = await baseline(p.problem);

    console.error("  · generating ADHD…");
    const adhdOutput = await adhd(p.problem);

    // Randomize A/B order so the judge's positional bias is balanced.
    const swapped = Math.random() < 0.5;
    const outA = swapped ? baselineOutput : adhdOutput;
    const outB = swapped ? adhdOutput : baselineOutput;

    console.error("  · judging…");
    const verdict = await judge(p.problem, outA, outB);

    rows.push({
      problemId: p.id,
      category: p.category,
      problem: p.problem,
      swapped,
      baselineOutput,
      adhdOutput,
      verdict,
    });

    const adhdLabel = swapped ? "B" : "A";
    const baseLabel = swapped ? "A" : "B";
    const adhdWon =
      verdict.overall_winner === adhdLabel ? "ADHD wins" :
      verdict.overall_winner === baseLabel ? "baseline wins" : "tie";
    console.error(`  → ${adhdWon} :: ${verdict.one_line_summary}`);
  }

  writeReport(rows);
  writeJson(rows);
  console.error(`\n✓ wrote EVALS.md + bench/results.json`);
}

function adhdScore(r: RowResult, dim: keyof Verdict): number {
  const v = r.verdict[dim] as { a: number; b: number };
  return r.swapped ? v.b : v.a;
}
function baselineScore(r: RowResult, dim: keyof Verdict): number {
  const v = r.verdict[dim] as { a: number; b: number };
  return r.swapped ? v.a : v.b;
}
function adhdWon(r: RowResult): "win" | "loss" | "tie" {
  const adhdLabel = r.swapped ? "B" : "A";
  const baseLabel = r.swapped ? "A" : "B";
  if (r.verdict.overall_winner === adhdLabel) return "win";
  if (r.verdict.overall_winner === baseLabel) return "loss";
  return "tie";
}

function writeReport(rows: RowResult[]) {
  const dims = ["breadth", "novelty", "trap_detection", "actionability", "builder_usefulness"] as const;

  const meanADHD = Object.fromEntries(
    dims.map((d) => [d, rows.reduce((s, r) => s + adhdScore(r, d), 0) / rows.length]),
  ) as Record<(typeof dims)[number], number>;
  const meanBase = Object.fromEntries(
    dims.map((d) => [d, rows.reduce((s, r) => s + baselineScore(r, d), 0) / rows.length]),
  ) as Record<(typeof dims)[number], number>;

  const wins = rows.filter((r) => adhdWon(r) === "win").length;
  const losses = rows.filter((r) => adhdWon(r) === "loss").length;
  const ties = rows.filter((r) => adhdWon(r) === "tie").length;

  const fmt = (n: number) => n.toFixed(2);
  const delta = (a: number, b: number) => {
    const d = a - b;
    return (d >= 0 ? "+" : "") + fmt(d);
  };

  const lines: string[] = [];
  lines.push(`# ADHD vs baseline — evals`);
  lines.push("");
  lines.push(`Run: ${new Date().toISOString()} · problems: ${rows.length}`);
  lines.push("");
  lines.push(`**Headline:** ADHD ${wins}W / ${losses}L / ${ties}T vs single-shot baseline.`);
  lines.push("");
  lines.push(`## Aggregate scores (mean across problems, 0–10)`);
  lines.push("");
  lines.push(`| Dimension | ADHD | Baseline | Δ |`);
  lines.push(`| --- | ---: | ---: | ---: |`);
  for (const d of dims) {
    lines.push(`| ${d} | ${fmt(meanADHD[d])} | ${fmt(meanBase[d])} | ${delta(meanADHD[d], meanBase[d])} |`);
  }
  lines.push("");
  lines.push(`## Per-problem verdicts`);
  lines.push("");
  for (const r of rows) {
    const winner = adhdWon(r) === "win" ? "✓ ADHD" : adhdWon(r) === "loss" ? "✗ baseline" : "= tie";
    lines.push(`### ${r.problemId} — ${winner}`);
    lines.push(`_${r.category} · A/B order swapped: ${r.swapped}_`);
    lines.push("");
    lines.push(`> ${r.problem}`);
    lines.push("");
    lines.push(`**Verdict:** ${r.verdict.one_line_summary}`);
    lines.push("");
    lines.push(`| dim | ADHD | base | reason |`);
    lines.push(`| --- | ---: | ---: | --- |`);
    for (const d of dims) {
      const reason = (r.verdict[d] as { reason: string }).reason.replace(/\|/g, "\\|");
      lines.push(`| ${d} | ${adhdScore(r, d)} | ${baselineScore(r, d)} | ${reason} |`);
    }
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(`_Methodology: each problem run through ADHD (5 frames × 6 ideas, top-3 deepened) and a single-shot baseline using the same model. A/B order randomized per problem to balance positional bias. Judged by a separate LLM call with a skeptical-staff-engineer system prompt._`);
  lines.push("");
  lines.push(`_Full transcripts: see \`bench/results.json\`._`);

  writeFileSync("EVALS.md", lines.join("\n"));
}

function writeJson(rows: RowResult[]) {
  writeFileSync("bench/results.json", JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
