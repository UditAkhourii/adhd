import assert from "node:assert/strict";
import test from "node:test";

import { buildQueryOptions } from "../src/llm.ts";

test("generation-only queries disable all built-in tools", () => {
  const options = buildQueryOptions({
    model: "claude-sonnet-4-5",
    systemPrompt: "Think divergently.",
    userPrompt: "Generate ideas.",
  });

  assert.deepEqual(options.tools, []);
  assert.equal("allowedTools" in options, false);
  assert.equal("permissionMode" in options, false);
});
