import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const script = fileURLToPath(new URL("../bench/run-evals.ts", import.meta.url));
// Resolved here because the runner is spawned from a scratch directory, where
// a bare `--import tsx` would not find the package.
const tsx = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;

test("--problem with an unknown id exits 1 and writes no report", (t) => {
  // The runner writes EVALS.md and bench/results.json relative to the CWD, so
  // run it from a scratch copy of that layout instead of the repo root.
  const cwd = mkdtempSync(join(tmpdir(), "adhd-evals-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  mkdirSync(join(cwd, "bench"));

  const result = spawnSync(process.execPath, ["--import", tsx, script, "--problem", "does-not-exist"], {
    cwd,
    env: { PATH: process.env.PATH },
    encoding: "utf8",
    timeout: 10000,
  });

  assert.equal(result.status, 1, `stderr: ${result.stderr}`);
  assert.match(result.stderr, /no problems matched --problem "does-not-exist"/);
  assert.match(result.stderr, /lru-100ms/);
  assert.equal(existsSync(join(cwd, "EVALS.md")), false, "EVALS.md was overwritten");
  assert.equal(existsSync(join(cwd, "bench", "results.json")), false, "bench/results.json was overwritten");
});
