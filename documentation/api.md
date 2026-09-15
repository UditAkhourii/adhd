# CLI & Library reference

[← back to README](../README.md)

## CLI

```bash
adhd "design a rate limiter that survives a leader election"

adhd "name this function" --frames 3 --ideas 8 --top 2

adhd "we have a CLI that hangs for 90s on LLM calls. what's the right retry/UX?" \
    --frames 5 --ideas 6 --top 3 --context ./client.ts

adhd "..." --json > result.json
```

### Flags

| Flag | Default | What |
| --- | --- | --- |
| `--frames N` | 5 | parallel divergence branches |
| `--ideas N` | 6 | ideas per branch |
| `--top N` | 3 | how many to deepen / focus |
| `--concurrency N` | 4 | max parallel LLM calls |
| `--context PATH` | — | inject a file as context (code, stack, constraints) |
| `--model NAME` | SDK default | override model (generator + critic) |
| `--critic-model NAME` | = `--model` | override model for the critic passes only (score + cluster) — use a different family to decorrelate critic errors |
| `--pack NAME` | `core` | draw frames from this pack; repeat to pool several packs |
| `--no-code-mode` | — | don't bias frames toward engineering |
| `--no-anchor-strip` | — | don't strip incidental anchors (stack, tool names) from the problem before fan-out |
| `--json` | — | emit machine-readable `RunResult` |
| `--quiet` | — | suppress progress events |

## Library (TypeScript)

```ts
import { run, renderText, FRAMES, PACKS, selectFrames } from "adhd-agent";
import type {
  RunOptions, RunResult, Idea, Branch, Cluster,
  DeepenedIdea, Score, RunEvent,
} from "adhd-agent";

type RunOptions = {
  problem: string;
  context?: string;
  framesPerRun?: number;   // default 5
  ideasPerFrame?: number;  // default 6
  topK?: number;           // default 3
  concurrency?: number;    // default 4
  codeMode?: boolean;      // default true
  stripAnchors?: boolean;  // strip incidental anchors before fan-out, default true
  model?: string;          // generator + critic
  criticModel?: string;    // critic (score + cluster) only; defaults to `model`
  packs?: string[];        // default ["core"]
  onEvent?: (e: RunEvent) => void;
};
```

A full run:

```ts
const result = await run({
  problem: "How should we shard this queue under bursty load?",
  context: readFileSync("./queue.ts", "utf8"),
  framesPerRun: 6,
  ideasPerFrame: 8,
  topK: 3,
  onEvent: (e) => console.error(e),
});

console.log(renderText(result));
// or operate on:
//   result.shortlist        → 2–4 most promising ideas with scores
//   result.nonObviousPick   → the highest-novelty viable one
//   result.traps            → "looks good but isn't" list, with reasons
//   result.deepened         → top-K expanded: sketch + risk + first step + child ideas
//   result.clusters         → the SHAPE of the idea space
```

Frames come from named packs. `PACKS` maps each pack name to its frames (`FRAMES` is the `core` pack), and `selectFrames(n, codeMode, packs)` pools the named packs before picking. An unknown name or an empty list throws.

```ts
console.log(Object.keys(PACKS)); // ["core"]
const frames = selectFrames(4, true, ["core"]);
```

Everything in `RunResult` is structured — clusters, scored ideas with `novelty / viability / fit`, trap reasons, deepened sketches with child ideas. You can route it into your own renderer, downstream agent, or planning loop.

## Use ADHD inside your own agent

The shape that pays the most: call `run()` at decision points inside a larger agent loop.

```ts
// inside your planning / coding / review agent
if (agentIsAtADecisionPoint) {
  const { shortlist, nonObviousPick, traps, deepened } = await run({
    problem: framedDecision,
    context: relevantCode,
    framesPerRun: 4,
    topK: 2,
    codeMode: true,
  });
  // feed the deepened sketches back into your agent's context
}
```

Good moments to call it:
- agent stuck after N attempts on a bug — widen the hypothesis space
- planning agent at a branch point with high uncertainty
- code-review agent asked *"what could go wrong here"*
- refactor agent picking which abstraction to introduce
- test-generation agent generating adversarial inputs (inversion frame)
