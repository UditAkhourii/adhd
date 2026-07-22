# Quickstart

[← back to README](../README.md)

Choose the agent skill for interactive use, the CLI for terminal runs, or the
library in an application. Node.js 18+ is required.

## Use ADHD as an agent skill

```bash
npx skills add UditAkhourii/adhd
```

Restart the agent, then invoke the skill explicitly:

```text
/adhd "design a rate limiter that survives a leader election"
```

The skill may auto-trigger for open-ended design, naming, refactoring, and
brainstorming prompts. Avoid it for lookups or known-root-cause bugs.

## Use the CLI

Auth: set `ANTHROPIC_API_KEY`, or (if installed) inherit auth from Claude Code.
Then install the package:
```bash
export ANTHROPIC_API_KEY="your-api-key"
npm install -g adhd-agent
adhd "design a retry strategy for an LLM request that sometimes hangs"
```

Common variations:

```bash
# Change breadth and the number of ideas deepened.
adhd "name this feature-flag service" --frames 3 --ideas 8 --top 2
# Add relevant source or constraints.
adhd "find migration strategies" --context ./architecture.md
# Write structured output for another program.
adhd "design a queue" --json --quiet > result.json
```

Expect several LLM calls. The default flow returns clusters, a shortlist,
traps, three deepened ideas, and a provocation.

## Use the TypeScript library

```bash
npm install adhd-agent
```

```ts
import { renderText, run } from "adhd-agent";

const result = await run({
  problem: "How should we shard this queue under bursty load?",
  topK: 3,
});
console.log(renderText(result));
```

If `adhd` is not found, reopen your shell and ensure npm's global binary
directory is on `PATH`. For agent discovery problems, follow
[Install](./install.md). See the [CLI & Library reference](./api.md) for every
flag and result type.
