# Frames — the cognitive distortions

[← back to README](../README.md)

A frame is a *vantage operator*: a system-prompt payload that re-poses the entire problem from a different cognitive position. Not a persona, not a domain expert — a deliberate distortion that forces the generator into a corner it would not naturally drift toward.

15 built-in frames ship today, biased toward engineering when `codeMode` is on (the default). Each is a vantage prompt plus tags.

| Frame | Vantage | Tags |
|---|---|---|
| **Hardware engineer** | latency, memory layout, physical constraints | code, wild |
| **Regulator / auditor** | what must be provable, traceable, refusable? | design, general |
| **10-year-old** | ignore convention; the naive, unencumbered approach | general, wild |
| **Competitor trying to break it** | adversarial; surface ideas by inversion | code, design |
| **Biology** | immune systems, neural plasticity, cell signaling, gut flora | code, wild |
| **Logistics** | queues, batching, just-in-time, hub-and-spoke, returns | code, design |
| **Game design** | loops, rewards, friction, save-states, speedrun tricks | design, general |
| **Markets** | auctions, futures contracts, clearing houses | design, wild |
| **Inversion** | ask the opposite question, then negate | code, design, general |
| **$0 budget / infinite budget** | extremes break anchoring | code, general |
| **Remove the load-bearing assumption** | what's possible if the framework / DB / network is gone? | code, design, wild |
| **Speedrunner** | glitches, skips, frame-perfect shortcuts | code, wild |
| **Ant colony / swarm** | no central planner, local rules, emergent behavior | code, wild |
| **3am on-call** | what design would let you not get paged? | code, design |

## How frames are selected

- Frames live in packs. The built-in frames are the `core` pack, [`src/packs/core.ts`](../src/packs/core.ts), and a run draws from `core` unless `--pack NAME` (repeatable) or `packs` in `RunOptions` names others.
- `codeMode` (default `true`) biases selection toward `code` and `design` tags.
- A `wild` frame always gets one reserved slot per run so divergence stays weird.
- Selection is deterministic per-seed so runs are reproducible.

## Authoring your own

A frame is ~5 lines in a pack under [`src/packs/`](../src/packs/): add it to [`src/packs/core.ts`](../src/packs/core.ts), or to a pack of its own for another domain. A good frame passes at least two of:

- **Distinct vocabulary** — concepts no existing frame uses (pheromone trails, futures contracts, frame-perfect skip).
- **Distinct posture** — adversarial vs constructive vs naive vs maximalist. Not just a different domain saying the same thing.
- **Reproducible distortion** — consistently surfaces ideas the other frames don't.

Full guide in [CONTRIBUTING.md](../CONTRIBUTING.md#authoring-a-new-frame).
