// Terminal renderer. Matches the output shape the original skill prescribes:
// brief → wide set (clustered) → converge (shortlist + non-obvious + traps)
// → deepened sketches → one provocation.
//
// Walls of equally-weighted prose hide the good ideas — so we use indentation,
// emphasis on the non-obvious pick, and small score chips.

import type { Idea, RunResult } from "./types.js";

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;

function chip(i: Idea): string {
  if (!i.score) return "";
  const { novelty, viability, fit } = i.score;
  return dim(`[N${novelty} V${viability} F${fit}]`);
}

export function renderText(r: RunResult): string {
  const out: string[] = [];

  out.push(bold("Problem: ") + r.problem);
  out.push("");

  // Wide set, by cluster.
  out.push(bold("Wide set"));
  const byCluster = new Map<string, Idea[]>();
  for (const b of r.branches) {
    for (const idea of b.ideas) {
      const key = idea.cluster ?? "(unclustered)";
      if (!byCluster.has(key)) byCluster.set(key, []);
      byCluster.get(key)!.push(idea);
    }
  }
  for (const [label, ideas] of byCluster) {
    out.push("  " + cyan(label));
    for (const i of ideas) {
      out.push(`    - ${i.text} ${chip(i)}`);
    }
  }
  out.push("");

  // Converge.
  out.push(bold("Converge — shortlist"));
  for (const i of r.shortlist) {
    const mark = r.nonObviousPick?.id === i.id ? green("★ non-obvious pick → ") : "  ";
    out.push(`  ${mark}${i.text} ${chip(i)}`);
    if (i.rationale) out.push(`    ${dim(i.rationale)}`);
    if (i.score?.strength) out.push(`    ${green("+")} ${dim(i.score.strength)}`);
  }
  out.push("");

  if (r.traps.length > 0) {
    out.push(bold("Traps (watch-outs, not verdicts)"));
    for (const t of r.traps) {
      out.push(`  ${red("⚠")} ${t.text}`);
      out.push(`    ${dim(t.score?.trap ?? "")}`);
      if (t.score?.strength) out.push(`    ${green("+")} ${dim(t.score.strength)}`);
    }
    out.push("");
  }

  // Deepened — the "focus" / connecting-the-dots passes.
  out.push(bold("Focus — deepened branches"));
  for (const d of r.deepened) {
    const parent = r.branches.flatMap((b) => b.ideas).find((i) => i.id === d.ideaId);
    out.push("  " + cyan("→ " + (parent?.text ?? d.ideaId)));
    out.push("    " + d.sketch.split("\n").join("\n    "));
    if (d.childIdeas.length > 0) {
      out.push("    " + dim("branches off:"));
      for (const c of d.childIdeas) {
        out.push(`      · ${c.text}${c.rationale ? dim(" — " + c.rationale) : ""}`);
      }
    }
    out.push("");
  }

  out.push(bold("Provocation"));
  out.push("  " + yellow(r.provocation));

  return out.join("\n");
}
