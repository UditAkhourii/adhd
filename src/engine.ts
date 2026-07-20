// Tree-of-thought engine with pruning.
//
// The Steve-Jobs "connecting the dots" loop:
//   1. Diverge wide — fan out N parallel branches, each running under a
//      different cognitive frame. No critic, no cross-talk. ADHD-mode.
//   2. Score every leaf on novelty / viability / fit.
//   3. Cluster — surface the SHAPE of the idea space, not just the leaves.
//   4. Prune to top-K and DEEPEN those by recursive expansion. This is
//      where the agent "focuses" — connecting one dot to many others.
//   5. Pick the non-obvious-but-viable one. Flag traps. Provoke once.
//
// Convergence happens after divergence, never during.

import pLimit from "p-limit";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { callLLM, parseJSON } from "./llm.js";
import { selectFrames, type Frame } from "./frames.js";
import type {
  Branch,
  Cluster,
  DeepenedIdea,
  Idea,
  RunOptions,
  RunResult,
  Score,
} from "./types.js";

const DivergeRowSchema = z.array(
  z.object({ text: z.string(), rationale: z.string().optional() }),
);

const ScoreRowSchema = z.array(
  z.object({
    id: z.string(),
    novelty: z.number().min(0).max(10),
    viability: z.number().min(0).max(10),
    fit: z.number().min(0).max(10),
    trap: z.string().optional(),
  }),
);

const ClusterSchema = z.array(
  z.object({ label: z.string(), ideaIds: z.array(z.string()) }),
);

const DeepenSchema = z.object({
  sketch: z.string(),
  childIdeas: z.array(
    z.object({ text: z.string(), rationale: z.string().optional() }),
  ),
});

const DIVERGE_SYSTEM = `You are in DIVERGENT mode. You are a generator, not a critic.
Rules:
- Output a JSON array only. No prose before/after.
- Generate the requested number of distinct ideas.
- Each idea is a SHORT phrase or single sentence. No paragraphs.
- Push past the obvious. The first 3 ideas you'd think of are banned —
  assume the reader already had those. Aim for the awkward middle.
- Bad, weird, and absurd ideas are welcome; they seed better ones.
- Do not evaluate, hedge, or rank. Just generate.`;

const SCORE_SYSTEM = `You are in CONVERGENT mode. You are now the critic.
Score each idea on three axes 0-10:
- novelty: distance from the obvious default solution
- viability: could this actually ship / work in practice
- fit: how directly it addresses the stated problem
If the idea looks attractive but is a TRAP (hidden cost, false economy,
will-not-scale, premature abstraction), set "trap" to a one-line reason.
Otherwise omit "trap".
Output JSON only.`;

const CLUSTER_SYSTEM = `You group ideas into 3-6 clusters by their UNDERLYING ANGLE
(not by surface keywords). Cluster labels name the angle, e.g.
"remove-the-server plays", "push-work-to-client plays", "cache-shaped plays".
Output JSON only.`;

const DEEPEN_SYSTEM = `You are in FOCUS mode. Take one promising idea and connect dots:
- Sketch how it would actually work (4-8 sentences).
- Name the load-bearing risk.
- Name the first concrete step a coder would take.
- Then generate 3-5 sub-ideas that branch off this one (variations,
  combinations with other domains, things this unlocks).
Output JSON only.`;

async function divergeBranch(
  problem: string,
  context: string | undefined,
  frame: Frame,
  ideasPerFrame: number,
  model: string | undefined,
): Promise<Branch> {
  const userPrompt = `PROBLEM:
${problem}

${context ? `CONTEXT:\n${context}\n\n` : ""}FRAME — ${frame.label}:
${frame.prompt}

Generate ${ideasPerFrame} ideas under this frame.
Output JSON array: [{"text": "...", "rationale": "..."}]
- text: one phrase/sentence, the idea itself
- rationale: 1 short clause on why this frame surfaces it (optional)`;

  const raw = await callLLM({
    model,
    systemPrompt: DIVERGE_SYSTEM,
    userPrompt,
  });

  let rows: z.infer<typeof DivergeRowSchema>;
  try {
    rows = parseJSON(raw, DivergeRowSchema);
  } catch {
    return { frameId: frame.id, ideas: [] };
  }

  const ideas: Idea[] = rows.map((r) => ({
    id: randomUUID(),
    frameId: frame.id,
    text: r.text,
    rationale: r.rationale,
    depth: 0,
  }));
  return { frameId: frame.id, ideas };
}

async function scoreIdeas(
  problem: string,
  ideas: Idea[],
  model: string | undefined,
): Promise<Map<string, Score>> {
  if (ideas.length === 0) return new Map();

  const userPrompt = `PROBLEM:
${problem}

IDEAS (id → text):
${ideas.map((i) => `${i.id} :: ${i.text}`).join("\n")}

Score each. Output JSON array:
[{"id":"...","novelty":0-10,"viability":0-10,"fit":0-10,"trap":"... or omit"}]`;

  const raw = await callLLM({
    model,
    systemPrompt: SCORE_SYSTEM,
    userPrompt,
  });

  let rows: z.infer<typeof ScoreRowSchema>;
  try {
    rows = parseJSON(raw, ScoreRowSchema);
  } catch {
    return new Map();
  }

  const out = new Map<string, Score>();
  for (const r of rows) {
    // Weight: novelty matters because the whole point is escaping the obvious,
    // but viability is the gatekeeper — a brilliant unshippable idea is a trap.
    const total = r.novelty * 0.35 + r.viability * 0.4 + r.fit * 0.25;
    out.set(r.id, {
      novelty: r.novelty,
      viability: r.viability,
      fit: r.fit,
      total,
      trap: r.trap,
    });
  }
  return out;
}

async function clusterIdeas(
  problem: string,
  ideas: Idea[],
  model: string | undefined,
): Promise<Cluster[]> {
  if (ideas.length === 0) return [];

  const userPrompt = `PROBLEM:
${problem}

IDEAS:
${ideas.map((i) => `${i.id} :: ${i.text}`).join("\n")}

Output JSON: [{"label":"...","ideaIds":["...","..."]}]`;

  const raw = await callLLM({
    model,
    systemPrompt: CLUSTER_SYSTEM,
    userPrompt,
  });

  try {
    return parseJSON(raw, ClusterSchema);
  } catch {
    return [];
  }
}

async function deepenIdea(
  problem: string,
  idea: Idea,
  siblings: Idea[],
  model: string | undefined,
): Promise<DeepenedIdea> {
  const userPrompt = `PROBLEM:
${problem}

FOCUS IDEA:
${idea.text}
${idea.rationale ? `(${idea.rationale})` : ""}

SIBLING IDEAS (use for recombination if useful):
${siblings
  .filter((s) => s.id !== idea.id)
  .slice(0, 12)
  .map((s) => `- ${s.text}`)
  .join("\n")}

Output JSON:
{
  "sketch": "4-8 sentences. How it works. Load-bearing risk. First concrete step.",
  "childIdeas": [
    {"text": "...", "rationale": "variation / hybrid / unlock"}
  ]
}`;

  const raw = await callLLM({
    model,
    systemPrompt: DEEPEN_SYSTEM,
    userPrompt,
  });

  let parsed: z.infer<typeof DeepenSchema>;
  try {
    parsed = parseJSON(raw, DeepenSchema);
  } catch {
    return { ideaId: idea.id, sketch: "(deepen pass failed to parse)", childIdeas: [] };
  }

  const childIdeas: Idea[] = parsed.childIdeas.map((c) => ({
    id: randomUUID(),
    frameId: idea.frameId,
    text: c.text,
    rationale: c.rationale,
    depth: idea.depth + 1,
    parentId: idea.id,
  }));

  return { ideaId: idea.id, sketch: parsed.sketch, childIdeas };
}

export async function run(opts: RunOptions): Promise<RunResult> {
  const {
    problem,
    context,
    framesPerRun = 5,
    ideasPerFrame = 6,
    topK = 3,
    concurrency = 4,
    codeMode = true,
    model,
    criticModel,
    onEvent,
  } = opts;

  // The critic (score + cluster) can run on a different model from the
  // generator to decorrelate errors. Defaults to the generator model.
  const critic = criticModel ?? model;

  const frames = selectFrames(framesPerRun, codeMode);
  const limit = pLimit(concurrency);

  // PHASE 1 — DIVERGE. Pure parallel fan-out. No branch sees another.
  const branches = await Promise.all(
    frames.map((f) =>
      limit(async () => {
        onEvent?.({ kind: "frame:start", frameId: f.id, frameLabel: f.label });
        const b = await divergeBranch(problem, context, f, ideasPerFrame, model);
        onEvent?.({ kind: "frame:done", frameId: f.id, count: b.ideas.length });
        return b;
      }),
    ),
  );

  const allIdeas: Idea[] = branches.flatMap((b) => b.ideas);

  // PHASE 2 — SCORE + CLUSTER. Critic comes back online.
  const [scoreMap, clusters] = await Promise.all([
    scoreIdeas(problem, allIdeas, critic),
    clusterIdeas(problem, allIdeas, critic),
  ]);
  for (const i of allIdeas) i.score = scoreMap.get(i.id);
  // Stamp cluster label onto each idea for nicer rendering.
  for (const c of clusters) for (const id of c.ideaIds) {
    const idea = allIdeas.find((x) => x.id === id);
    if (idea) idea.cluster = c.label;
  }
  onEvent?.({ kind: "score:done", total: allIdeas.length });
  onEvent?.({ kind: "cluster:done", clusters: clusters.length });

  // Shortlist: top by total, excluding traps. Traps reported separately.
  const traps = allIdeas.filter((i) => i.score?.trap);
  const ranked = allIdeas
    .filter((i) => i.score && !i.score.trap)
    .sort((a, b) => (b.score!.total - a.score!.total));
  const shortlist = ranked.slice(0, Math.max(2, Math.min(4, topK + 1)));

  // Non-obvious pick = highest novelty among the viable shortlist.
  const nonObviousPick =
    shortlist.length === 0
      ? null
      : [...shortlist].sort(
          (a, b) =>
            (b.score!.novelty + b.score!.viability * 0.5) -
            (a.score!.novelty + a.score!.viability * 0.5),
        )[0];

  // PHASE 3 — FOCUS / DEEPEN top-K. This is the "connecting the dots" pass.
  const toDeepen = ranked.slice(0, topK);
  const deepened = await Promise.all(
    toDeepen.map((idea) =>
      limit(async () => {
        onEvent?.({ kind: "deepen:start", ideaId: idea.id, text: idea.text });
        const d = await deepenIdea(problem, idea, allIdeas, model);
        onEvent?.({ kind: "deepen:done", ideaId: idea.id });
        return d;
      }),
    ),
  );

  // One provocation = a wild-tagged frame's lowest-scoring-but-highest-novelty leaf,
  // reframed as a question. Cheap, doesn't need another LLM call.
  const wildcard = allIdeas
    .filter((i) => i.score)
    .sort((a, b) => b.score!.novelty - a.score!.novelty)[0];
  const provocation = wildcard
    ? `What if we took this seriously: ${wildcard.text}`
    : "What's the assumption nobody named yet?";

  return {
    problem,
    branches,
    clusters,
    shortlist,
    nonObviousPick,
    traps,
    deepened,
    provocation,
  };
}
