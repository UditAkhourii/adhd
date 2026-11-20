import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url);

test("--pack with an unknown name exits 1 naming the pack", () => {
  // PATH alone, so a run that gets past pack validation finds no API key in its
  // environment, and the timeout ends it rather than a model call.
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", "--pack", "nope", "x"], {
    cwd: root,
    env: { PATH: process.env.PATH },
    encoding: "utf8",
    timeout: 5000,
  });

  assert.equal(result.status, 1, `stderr: ${result.stderr}`);
  assert.match(result.stderr, /Unknown frame pack "nope"/);
});

test("--pack with no name exits 1 before any LLM call", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", "x", "--pack"], {
    cwd: root,
    env: { PATH: process.env.PATH },
    encoding: "utf8",
    timeout: 5000,
  });

  assert.equal(result.status, 1, `stderr: ${result.stderr}`);
  assert.match(result.stderr, /--pack needs a pack name/);
});

function cli(...args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", "src/cli.ts", ...args], {
    cwd: root,
    env: { PATH: process.env.PATH },
    encoding: "utf8",
    timeout: 5000,
  });
}

// One line on stderr and no stack trace, the way every other bad flag fails.
function assertOneLineError(result: ReturnType<typeof cli>, pattern: RegExp) {
  assert.equal(result.status, 1, `stderr: ${result.stderr}`);
  assert.match(result.stderr, pattern);
  assert.equal(result.stderr.trim().split("\n").length, 1, `stderr: ${result.stderr}`);
}

test("--context with a missing file exits 1 with a one-line error", () => {
  assertOneLineError(cli("x", "--context", "does-not-exist.md"), /^Error: .*--context.*does-not-exist\.md/);
});

test("--context with no path exits 1 with a one-line error", () => {
  assertOneLineError(cli("x", "--context"), /^Error: --context needs a file path/);
});

test("--context pointing at a directory exits 1 with a one-line error", () => {
  assertOneLineError(cli("x", "--context", "src"), /^Error: --context .*src/);
});

test("--context over 10 MB still exits 1 with the size error", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "adhd-context-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const big = join(dir, "big.md");
  writeFileSync(big, Buffer.alloc(10 * 1024 * 1024 + 1));

  assertOneLineError(cli("x", "--context", big), /^Error: context file is 10\.0 MB \(max 10 MB\)/);
});

test("a readable --context file is accepted", () => {
  // Gets past --context, then stops at the unknown pack before any LLM call.
  const result = cli("x", "--context", "package.json", "--pack", "nope");

  assert.equal(result.status, 1, `stderr: ${result.stderr}`);
  assert.match(result.stderr, /Unknown frame pack "nope"/);
});
