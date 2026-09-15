import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
