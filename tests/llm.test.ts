import assert from "node:assert/strict";
import test from "node:test";

import { buildQueryOptions, parseJSON } from "../src/llm.ts";
import { z } from "zod";

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

test("parseJSON strips fences and handles preambles and postambles", () => {
  const fenced = '```json\n{"hello": "world"}\n```';
  assert.deepEqual(parseJSON(fenced), { hello: "world" });

  const withPreambleAndPostamble = 'Here is your response:\n[{"id": "1", "text": "foo"}]\nHope this helps!';
  assert.deepEqual(parseJSON(withPreambleAndPostamble), [{ id: "1", text: "foo" }]);

  const schema = z.object({ value: z.number() });
  assert.deepEqual(parseJSON('Prefix {"value": 42} Suffix', schema), { value: 42 });
});
