# Contributing to ADHDStack

Thanks for caring. ADHD is small on purpose — the value lives in the *frames* and the *loop discipline*, not the LOC. Most contributions will be one of:

1. **A new frame** (highest leverage, smallest change)
2. **An improvement to the diverge/score/cluster/deepen loop**
3. **A new eval problem** that exposes where ADHD wins or loses
4. **Docs / examples / launch material**

---

## Dev setup

```bash
git clone https://github.com/UditAkhourii/adhd.git
cd adhd
npm install
npm run build
export ANTHROPIC_API_KEY=...   # or rely on local Claude Code auth
node dist/cli.js "your test problem here"
```

Iterating without rebuilding:

```bash
npm run dev -- "your test problem here"   # tsx, no build step
```

---

## Authoring a new frame

A frame is the cheapest, highest-leverage contribution. Every new frame widens what the package can surface for the next user.

**A good frame** pushes the generator into a corner it would not naturally drift toward. Bad frames are paraphrases of an existing one.

### The shape

In [`src/packs/core.ts`](./src/packs/core.ts), append to the `core` array (or to your own pack, below):

```ts
{
  id: "supply-chain-attacker",
  label: "Supply-chain attacker",
  prompt:
    "You compromise software by attacking what people TRUST: package managers, build tools, " +
    "CI runners, vendored dependencies, mirror infrastructure. Re-ask this problem as: what " +
    "would I plant, and where, to compromise the result without touching the application code?",
  tags: ["code", "design", "wild"],
},
```

Fields:

| Field | What |
|---|---|
| `id` | kebab-case, stable forever — don't rename |
| `label` | shown to the user; ~3 words |
| `prompt` | the vantage prompt. Written as instruction to the generator: *"You are X. Re-ask this as Y."* |
| `tags` | any of `"code"`, `"design"`, `"general"`, `"wild"`. Tags affect frame selection — `code-mode` (default) biases toward `code`/`design`; `wild` always has one slot reserved per run. |

### Adding a pack

Frames for another domain go in a pack of their own rather than in `core`:

1. Create a module under [`src/packs/`](./src/packs/), e.g. `src/packs/security.ts`, exporting a `Frame[]`:

   ```ts
   import type { Frame } from "../frames.js";

   export const security: Frame[] = [
     // frames, in the shape above
   ];
   ```

2. Register it by name in the `PACKS` object in [`src/frames.ts`](./src/frames.ts):

   ```ts
   import { security } from "./packs/security.js";

   export const PACKS: Record<string, Frame[]> = { core, security };
   ```

3. Select it with `--pack security` on the CLI (repeat `--pack` to pool several packs) or `packs: ["security"]` in `RunOptions`. Without either, only `core` is used. A pack with no `wild` frame still gets one from `core`, and a pack with no `code` or `design` frame is used whole under code-mode.

### Quality bar

A new frame should pass at least two of these:

- **Distinct vocabulary** — the prompt uses concepts (latency budget, pheromone trails, futures contracts, frame-perfect skip) that none of the existing frames use.
- **Distinct posture** — adversarial vs constructive vs naive vs maximalist. Not just a different domain saying the same thing.
- **Reproducible distortion** — running the same problem through this frame consistently surfaces ideas the other frames don't.

### Test it

Run your frame in isolation and check that the ideas are *structurally different* from what the other frames produce on the same problem:

```bash
# put the new frame alone in a one-frame pack (see "Adding a pack"), e.g.
# src/packs/scratch.ts registered as `scratch` in PACKS, then run:
npm run dev -- "design a write-ahead log under bursty load" --pack scratch
```

If the ideas are paraphrases of what the "hardware" or "logistics" frame already produces, the frame isn't earning its slot. Iterate the prompt.

---

## Adding an eval problem

Eval problems live in [`bench/problems.json`](./bench/problems.json). A good eval problem has:

- An **open-ended** answer space (not "what's the syntax for X")
- A **non-trivial obvious answer** (so the baseline has something credible to fall back on)
- A **specific constraint** that rewards non-obvious thinking (the "100ms" or "leader election" in the existing problems)
- A **category** that's not already over-represented

Then run:

```bash
npm run build
npm run evals               # full suite
npm run evals -- --problem your-new-id   # just yours
```

Output is `EVALS.md` + `bench/results.json`. Costs ~10 LLM calls per problem (5 frames + score + cluster + 3 deepen + 1 baseline + 1 judge).

---

## Loop changes (engine.ts)

The loop is small on purpose. Before changing it, read the source spec in [SKILL.md](./SKILL.md) — most "improvements" violate the load-bearing invariants:

- **Branches must not see each other during divergence.** This is the whole point.
- **Generator and critic must use separate LLM calls with opposite system prompts.** Don't merge them for efficiency.
- **Score before deepen.** Deepening unscored ideas is just expensive generation.
- **Cluster by underlying angle, not surface keywords.** If the cluster pass starts outputting `"caching ideas"` instead of `"remove-the-server plays"`, the prompt has drifted.

If your change weakens any of these, the bar is higher.

Good loop changes:
- recursive deepen (multi-level ToT)
- pluggable scorers (let users supply their own weights / trap detectors)
- streaming output during divergence
- cross-model support (frames don't depend on Claude)

---

## Style

- TypeScript strict mode. No `any` unless commented why.
- Comments are for **why**, not what. Code shows what.
- New deps need justification. Current deps: `@anthropic-ai/claude-agent-sdk`, `p-limit`, `zod`. That's already three more than the loop strictly needs.
- No emojis in source (renderer is allowed terminal symbols).

---

## PRs

- One concern per PR.
- New frame? Include a 2-line "what this frame catches that others miss" in the PR body.
- New eval? Include the run output.
- Loop change? Include before/after on at least one eval problem.

---

## License

By contributing, you agree your contribution is licensed under MIT.
