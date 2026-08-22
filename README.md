<p align="center">
  <a href="https://adhdstack.github.io/">
    <img src="docs/hero.png" alt="ADHD for Claude Code" width="100%">
  </a>
</p>

# ADHD — a skill for agents

[![CI](https://github.com/UditAkhourii/adhd/actions/workflows/ci.yml/badge.svg)](https://github.com/UditAkhourii/adhd/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/adhd-agent.svg)](https://www.npmjs.com/package/adhd-agent)
[![Docs](https://img.shields.io/badge/docs-adhd.mintlify.site-0EA5E9)](https://adhd.mintlify.site/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](./documentation/install.md)
[![Paper](https://img.shields.io/badge/paper-preprint-blueviolet)](https://adhdstack.github.io/)
[![Featured: The New Stack](https://img.shields.io/badge/featured-The%20New%20Stack-ff5500)](https://thenewstack.io/claude-code-adhd/)
[![Discord](https://img.shields.io/badge/Discord-Join%20the%20chat-5865F2?logo=discord&logoColor=white)](https://discord.gg/NbWwkwwGw)

<a href="https://trendshift.io/repositories/39300?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-39300" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/39300/daily?language=TypeScript" alt="UditAkhourii%2Fadhd | Trendshift" width="250" height="55"/></a>

> 🎮 [**Join the Discord →**](https://discord.gg/NbWwkwwGw) for frame design, eval problems, and trap-hunting in real time · 👉 [**Join the community →**](https://tally.so/r/WO1Nzj) as a contributor, maintainer, or early adopter (one short form).

> **An architectural fix for premature convergence in autoregressive reasoning.**

Linear Chain-of-Thought anchors on whatever it says first. Tree-of-Thought widens the search but still walks a single shared context, so the anchoring persists across branches. **ADHD treats this as an architectural problem, not a prompting one** — it spawns N isolated reasoning processes under deliberately distorted cognitive frames, with zero shared context during divergence, then runs a separate critic pass to score, cluster, prune traps, and deepen the survivors.

Reach for it on **design decisions, fuzzy debugging, naming, API surface design, strategy, and any prompt of the shape *"give me a few ways to…"***.

📚 **Official docs:** [adhd.mintlify.site](https://adhd.mintlify.site/) · 📄 **Preprint:** [ADHD: Parallel Divergent Ideation for Coding Agents](https://adhdstack.github.io/) · 👤 **Author:** Udit Akhouri — [@akhouriudit](https://x.com/akhouriudit) · [LinkedIn](https://www.linkedin.com/in/udit-akhouri-10160a168/)

---

## Side-by-side: baseline vs ADHD

One eval problem, same model, two strategies. Full transcripts in [`bench/results.json`](./bench/results.json).

> **Problem.** *"We have a CLI that calls an LLM and it sometimes hangs for 90 seconds. Design the right retry/timeout/UX strategy."*

Baseline gives the sensible textbook hybrid (staged timeouts + one auto-retry) — the answer a senior engineer gives in 30 seconds, with no traps named. ADHD spawns 6 isolated frames, surfaces 30+ ideas, flags 20 traps with reasons, and lands the non-obvious pick baseline never considers: **the slow model might just be the wrong model for this prompt** — instant abort + branch to a cheaper/faster one.

<details>
<summary><strong>Expand the full side-by-side</strong></summary>

<table>
<tr>
<th width="50%">🟦 Baseline (single-shot)</th>
<th width="50%">🟧 ADHD</th>
</tr>
<tr valign="top">
<td>

Walks through four **textbook** patterns:

1. Progressive timeout with staged UI (10s / 30s / 60s)
2. Fast-fail + exponential backoff retry
3. Hedged parallel requests
4. Streaming with keepalive

Lands on a **hybrid** recommendation — 15s first-token timeout, 30s between-token timeout, 90s absolute, one auto-retry. Sensible. Google SRE Book ch. 22. The answer a senior engineer gives in 30 seconds.

**What's missing:** no traps named, no acknowledgement that the *user* might want to bail out of a slow request, no questioning of the "wait then retry the same model" frame.

</td>
<td>

Spawns 6 isolated frames, surfaces a **wide set** of 30+ ideas across `economic-incentive`, `async-control-surface`, `gamification`, `perceptual-distortion`, `collective-intelligence`, `redundancy-race` clusters, then:

- ★ **Non-obvious pick:** *"rage-quit = instant abort + branch to cheaper/faster model"* — a button that pulses hotter the longer you wait. One click cancels and re-submits to Haiku-class. The thing baseline never considers: **the slow model might just be the wrong model for this prompt.**
- Plus shortlist: scout-fork to alternate endpoints at 30s; daemonize the CLI with ticket IDs; race 3 LLM replicas, cache the winner.
- **20 traps flagged with one-line reasons** — including the cute "stream tokens in reverse" and "patience-token billing" ideas before they cost engineering time.

</td>
</tr>
</table>

</details>

Independent LLM judge on this problem: **breadth 9 vs 6, novelty 8 vs 3, trap detection ~8 vs ~2.** Methodology in [documentation/evals.md](./documentation/evals.md).

---

## Featured

- 🔌 **Adopted by [repowire](https://github.com/prassanna-ravishankar/repowire)** — the first OSS project to officially ship ADHD, ported onto its mesh-orchestrator primitives in [PR #313](https://github.com/prassanna-ravishankar/repowire/pull/313) (merged).
- 📰 **[The New Stack](https://thenewstack.io/claude-code-adhd/)** ran a feature story on ADHD for Claude Code.
- 💬 **OpenClaw / multi-agent community** is independently testing it across agents. One tester: *"I read it, installed it on two different agents… I actually love it. This is great. I thought this was gonna be another useless post. But no, it wasn't."*
- 🔬 An independent **[evidence-based research review](https://github.com/testdouble/han/blob/adhd-swarm-research/docs/research/adhd-application-to-han.md)** (11 sources, 8 validation rounds) was published against the method — findings tracked openly as [issues #16–#18](https://github.com/UditAkhourii/adhd/issues).

---

## Early adopters

**17+ projects** ship or integrate ADHD — including [repowire](https://github.com/prassanna-ravishankar/repowire), [mstack](https://github.com/mayank-io/mstack), [zk-flow-oss](https://github.com/matt-metivier/zk-flow-oss), [han](https://github.com/testdouble/han), [wtfismyrepo](https://github.com/nandnijaiswal/wtfismyrepo), and [awesome-prompts](https://github.com/ai-boost/awesome-prompts). The full table of who shipped what lives in **[ADOPTERS.md](./ADOPTERS.md)**.

Shipping ADHD in your project? Open a PR adding yourself to [ADOPTERS.md](./ADOPTERS.md), or [open an issue](https://github.com/UditAkhourii/adhd/issues/new) and we'll add you.

---

## Install

One command, auto-detects your agent (Claude Code, Cursor, Antigravity, Codex, Cline, Gemini CLI, Windsurf, and ~50 more):

```bash
npx skills add UditAkhourii/adhd
```

Then invoke explicitly with `/adhd "your problem"`, or let it auto-trigger on ideation intents.

```bash
npm install -g adhd-agent     # CLI
npm install adhd-agent        # library
```

CLI and library installs, the Codex quick path, manual curl for other agents, and per-platform paths are in **[documentation/install.md](./documentation/install.md)**.

---

## Quickstart

```bash
adhd "design a rate limiter that survives a leader election"
adhd "name this function" --frames 3 --ideas 8 --top 2
```

```ts
import { run, renderText } from "adhd-agent";

const result = await run({ problem: "How should we shard this queue under bursty load?", framesPerRun: 5, topK: 3 });
console.log(renderText(result));
// result.shortlist · result.nonObviousPick · result.traps · result.deepened · result.clusters
```

Full reference: **[documentation/api.md](./documentation/api.md)**.

---

## How it works

A two-phase loop with a hard wall between the phases.

1. **Diverge.** Pick N cognitive frames. Spawn N parallel, **isolated** Agent calls — each sees the problem plus one frame's vantage prompt, and a system prompt that forbids evaluation. Branches never see each other, so no anchoring.
2. **Focus.** A separate critic call scores every idea (`novelty / viability / fit`), flags traps with reasons, clusters by underlying angle, and deepens the top-K survivors into sketches with risks and first steps.

The generator-critic split is **mechanical** — separate LLM calls with opposite system prompts — not promised in one prompt. Deep dive: **[documentation/how-it-works.md](./documentation/how-it-works.md)**. How it differs from CoT and ToT: **[documentation/vs-cot-and-tot.md](./documentation/vs-cot-and-tot.md)**.

---

## Results

Mean scores across 6 open-ended engineering problems (0–10), ADHD vs a single-shot baseline at the same model, judged by an independent LLM with a skeptical-staff-engineer prompt, A/B order randomized.

| Dimension          | ADHD     | Baseline | Δ         | Ratio |
| ------------------ | -------: | -------: | --------: | ----: |
| breadth            | **9.00** | 4.83     | **+4.17** | 1.9×  |
| novelty            | **7.83** | 2.67     | **+5.17** | 2.9×  |
| trap detection     | **9.50** | 1.83     | **+7.67** | 5.2×  |
| actionability      | **9.50** | 6.50     | **+3.00** | 1.5×  |
| builder usefulness | **7.67** | 6.83     | **+0.83** | 1.1×  |

**ADHD wins 5 of 6 problems.** Biggest gap is trap detection — baselines rarely name the seductive-but-broken ideas. Methodology, limitations, and how to reproduce: **[documentation/evals.md](./documentation/evals.md)**.

---

## Documentation

📚 **Official docs:** [**adhd.mintlify.site**](https://adhd.mintlify.site/) — the full, browsable documentation site.

In-repo pages:

| Page | What's in it |
|---|---|
| [Quickstart](./documentation/quickstart.md) | First skill, CLI, and TypeScript runs with practical commands |
| [Install](./documentation/install.md) | Every install path — skill, CLI, library, Agent SDK, per-platform |
| [How it works](./documentation/how-it-works.md) | The two-phase loop + architecture (context, pruning, orchestration) |
| [vs CoT & ToT](./documentation/vs-cot-and-tot.md) | Structural comparison, the three load-bearing differences, frames vs personas |
| [Frames](./documentation/frames.md) | The 15 cognitive frames, how selection works, how to author your own |
| [When to use](./documentation/when-to-use.md) | Use / don't use, why it shines on creative work, cost & speed |
| [CLI & API](./documentation/api.md) | CLI flags, library types, using ADHD inside your own agent |
| [Evals](./documentation/evals.md) | Methodology, headline numbers, limitations, roadmap |

Also: [SKILL.md](./skills/adhd/SKILL.md) (the runnable skill) · [SOURCE-SPEC.md](./SOURCE-SPEC.md) (original spec) · [CONTRIBUTING.md](./CONTRIBUTING.md) · [the preprint](https://adhdstack.github.io/).

---

## Star History

<a href="https://www.star-history.com/?repos=UditAkhourii%2Fadhd&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=UditAkhourii/adhd&type=date&theme=dark&legend=top-left&sealed_token=_61--Q_Ev0_B7e-nUMAMTCYQJixOhQGyQyXO-6nA_AKqyBlPVkAOPJaoKq2mnzIhIP77I4hbSo1TdytVtrd5vNQHAN3-aL5Zn-KTGh1-AYEV77E68uZChA" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=UditAkhourii/adhd&type=date&legend=top-left&sealed_token=_61--Q_Ev0_B7e-nUMAMTCYQJixOhQGyQyXO-6nA_AKqyBlPVkAOPJaoKq2mnzIhIP77I4hbSo1TdytVtrd5vNQHAN3-aL5Zn-KTGh1-AYEV77E68uZChA" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=UditAkhourii/adhd&type=date&legend=top-left&sealed_token=_61--Q_Ev0_B7e-nUMAMTCYQJixOhQGyQyXO-6nA_AKqyBlPVkAOPJaoKq2mnzIhIP77I4hbSo1TdytVtrd5vNQHAN3-aL5Zn-KTGh1-AYEV77E68uZChA" />
 </picture>
</a>

---

## External reviews

- [**Han plugin compatibility analysis**](https://github.com/testdouble/han/blob/adhd-swarm-research/docs/research/adhd-application-to-han.md) by [@mxriverlynn](https://www.reddit.com/user/mxriverlynn) — evidence-based review using Han's own `/research` skill, 11 sources, 8 validation rounds. Findings tracked as issues [#16](https://github.com/UditAkhourii/adhd/issues/16), [#17](https://github.com/UditAkhourii/adhd/issues/17), [#18](https://github.com/UditAkhourii/adhd/issues/18).
- [**A measured duel vs. single-shot**](https://miyagadget.page/en/blog/2026/06/03/adhd-coding-agent-skill-en/) by Shichinomiya ([@shichinomiya_s](https://miyagadget.page)) — independent blind-scored benchmark (2 problems, LLM-as-judge, A/B positions swapped). ADHD won both, with the biggest gains in novelty (4.5→9.0) and trap detection (5.0→9.0), at a real cost of ~2.3× time and ~1.9× output.

---

## License

MIT License.

ADHD operationalizes the *Divergent Ideation* source spec ([SOURCE-SPEC.md](./SOURCE-SPEC.md)). The runnable skill is at [`skills/adhd/SKILL.md`](./skills/adhd/SKILL.md).

---

## Contact

**Udit Akhouri** — author of the preprint and maintainer.

[adhdstack.github.io](https://adhdstack.github.io/) · [@akhouriudit](https://x.com/akhouriudit) · [LinkedIn](https://www.linkedin.com/in/udit-akhouri-10160a168/) · [researchudit@gmail.com](mailto:researchudit@gmail.com) · [@UditAkhourii](https://github.com/UditAkhourii)

Open to collaboration with research labs and applied-AI teams working on reasoning, planning, and agentic systems.
