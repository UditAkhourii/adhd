#!/usr/bin/env node
// CLI surface for connect-dots.
//
// Usage:
//   connect-dots "how should we shard this queue?"
//   connect-dots "..." --frames 6 --ideas 8 --top 4 --context ./CONTEXT.md
//   connect-dots "..." --json > result.json

import { readFileSync, statSync } from "node:fs";
import { run } from "./engine.js";
import { renderText } from "./render.js";
import type { RunEvent, RunOptions } from "./types.js";

type Flags = {
  problem: string;
  context?: string;
  frames?: number;
  ideas?: number;
  top?: number;
  concurrency?: number;
  codeMode: boolean;
  json: boolean;
  quiet: boolean;
  model?: string;
  criticModel?: string;
};

function positiveInt(raw: string, flag: string, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
    console.error(`Error: ${flag} must be a positive integer, got "${raw}"`);
    process.exit(1);
  }
  if (n > max) {
    console.error(`Error: ${flag} must be at most ${max}, got ${n}`);
    process.exit(1);
  }
  return n;
}

const MAX_CONTEXT_BYTES = 10 * 1024 * 1024; // 10 MB

function parse(argv: string[]): Flags {
  const f: Flags = { problem: "", codeMode: true, json: false, quiet: false };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--frames": f.frames = positiveInt(argv[++i], "--frames", 20); break;
      case "--ideas": f.ideas = positiveInt(argv[++i], "--ideas", 50); break;
      case "--top": f.top = positiveInt(argv[++i], "--top", 20); break;
      case "--concurrency": f.concurrency = positiveInt(argv[++i], "--concurrency", 16); break;
      case "--context": {
        const path = argv[++i];
        const { size } = statSync(path);
        if (size > MAX_CONTEXT_BYTES) {
          console.error(`Error: context file is ${(size / 1024 / 1024).toFixed(1)} MB (max 10 MB)`);
          process.exit(1);
        }
        f.context = readFileSync(path, "utf8");
        break;
      }
      case "--model": f.model = argv[++i]; break;
      case "--critic-model": f.criticModel = argv[++i]; break;
      case "--no-code-mode": f.codeMode = false; break;
      case "--json": f.json = true; break;
      case "--quiet": f.quiet = true; break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
      default:
        rest.push(a);
    }
  }
  f.problem = rest.join(" ").trim();
  return f;
}

function printHelp() {
  console.log(`adhd — a skill for coding agents

  Stop your agent from picking the first answer. Fans out many parallel
  divergent thoughts under different cognitive frames, scores them,
  prunes traps, and deepens the survivors. Tree-of-thought with pruning,
  built on the Claude Agent SDK.

USAGE
  adhd "<problem>" [flags]

FLAGS
  --frames N        number of parallel divergence branches (default 5)
  --ideas N         ideas per branch (default 6)
  --top N           how many to deepen / focus on (default 3)
  --concurrency N   max parallel LLM calls (default 4)
  --context PATH    file to inject as context (code, constraints, stack)
  --model NAME      override the SDK model (generator + critic)
  --critic-model N  override the model for the critic passes only
                    (score + cluster); decorrelates critic errors
  --no-code-mode    don't bias frames toward engineering
  --json            emit RunResult as JSON
  --quiet           suppress progress events
  -h, --help

EXAMPLES
  adhd "design a rate limiter that survives a leader election"
  adhd "name this function" --frames 3 --ideas 8 --top 2
  adhd "..." --context ./snippet.ts --json > out.json
`);
}

async function main() {
  const flags = parse(process.argv.slice(2));
  if (!flags.problem) { printHelp(); process.exit(1); }

  const onEvent = flags.quiet ? undefined : (e: RunEvent) => {
    switch (e.kind) {
      case "frame:start": process.stderr.write(`  ▸ ${e.frameLabel}…\n`); break;
      case "frame:done":  process.stderr.write(`    ${e.count} ideas (${e.frameId})\n`); break;
      case "score:done":  process.stderr.write(`  scored ${e.total} ideas\n`); break;
      case "cluster:done":process.stderr.write(`  ${e.clusters} clusters\n`); break;
      case "deepen:start":process.stderr.write(`  ◎ focus → ${e.text}\n`); break;
      case "warn":        process.stderr.write(`  ! ${e.message}\n`); break;
    }
  };

  const opts: RunOptions = {
    problem: flags.problem,
    context: flags.context,
    framesPerRun: flags.frames,
    ideasPerFrame: flags.ideas,
    topK: flags.top,
    concurrency: flags.concurrency,
    codeMode: flags.codeMode,
    model: flags.model,
    criticModel: flags.criticModel,
    onEvent,
  };

  const result = await run(opts);

  if (flags.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(renderText(result) + "\n");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
