// Frames push the generator into corners it wouldn't naturally go.
// Each frame is a strategy for re-asking the same engineering problem
// from a different vantage point. Pick a subset per run — don't grind all.

export type Frame = {
  id: string;
  label: string;
  // The system prompt fragment injected into the divergent branch.
  // Written as an instruction: "you are X, generate ideas as X would."
  prompt: string;
  // Engineering domain tag — used by the orchestrator to bias frame
  // selection when the problem looks code-shaped.
  tags: ("code" | "design" | "general" | "wild")[];
};

export const FRAMES: Frame[] = [
  {
    id: "hardware-eyes",
    label: "Hardware engineer",
    prompt:
      "You think in latency, memory layout, and physical constraints. Re-ask this problem as if it were a hardware/firmware problem. What does the bus topology, the cache, the timing budget tell you?",
    tags: ["code", "wild"],
  },
  {
    id: "regulator",
    label: "Regulator / auditor",
    prompt:
      "You audit systems for compliance and failure modes. What ideas surface when you ask: what must be provable, traceable, or refusable here?",
    tags: ["design", "general"],
  },
  {
    id: "ten-year-old",
    label: "10-year-old",
    prompt:
      "You are a curious 10-year-old who has never seen software before. Describe naive but unencumbered approaches. Ignore convention.",
    tags: ["general", "wild"],
  },
  {
    id: "adversary",
    label: "Competitor trying to break it",
    prompt:
      "You are a hostile competitor or attacker. Generate approaches that exploit, fail, or sabotage the obvious solution. Then invert into ideas.",
    tags: ["code", "design"],
  },
  {
    id: "biology",
    label: "Cross-domain: biology",
    prompt:
      "Transplant a mechanism from biology — immune systems, neural plasticity, cell signaling, evolution, gut flora — and force-fit it onto this engineering problem.",
    tags: ["code", "wild"],
  },
  {
    id: "logistics",
    label: "Cross-domain: logistics / supply chain",
    prompt:
      "Steal mechanisms from logistics: queues, batching, just-in-time, hub-and-spoke, returns, last-mile. Apply them literally to this problem.",
    tags: ["code", "design"],
  },
  {
    id: "game-design",
    label: "Cross-domain: game design",
    prompt:
      "Approach this as a game designer. What are the loops, rewards, friction, save-states, speedrun tricks? Treat the user/system as a player.",
    tags: ["design", "general"],
  },
  {
    id: "markets",
    label: "Cross-domain: markets",
    prompt:
      "Treat the problem as a market. Who are the buyers, sellers, market-makers? What does an auction, a futures contract, a clearing house look like here?",
    tags: ["design", "wild"],
  },
  {
    id: "inversion",
    label: "Inversion",
    prompt:
      "Ask the OPPOSITE question. If the goal is X, brainstorm 'how would we guarantee NOT-X' — then negate each answer back into an idea.",
    tags: ["code", "design", "general"],
  },
  {
    id: "extreme-zero",
    label: "Extreme: $0 budget, 1 hour",
    prompt:
      "You have no money, no team, one hour. What's the crudest version that still does the load-bearing thing? Hacks, hardcoded values, manual loops welcome.",
    tags: ["code", "general"],
  },
  {
    id: "extreme-infinite",
    label: "Extreme: infinite budget, 10 years",
    prompt:
      "You have infinite compute, infinite engineers, a decade. What does the maximalist version look like? What would only be possible at that scale?",
    tags: ["design", "wild"],
  },
  {
    id: "remove-assumption",
    label: "Remove the load-bearing assumption",
    prompt:
      "Name the thing everyone treats as fixed in this problem (the framework, the database, the request/response model, the file system, the network). Imagine it's gone. Generate ideas that only exist in that world.",
    tags: ["code", "design", "wild"],
  },
  {
    id: "speedrunner",
    label: "Speedrunner",
    prompt:
      "You're a speedrunner. Find glitches, skips, out-of-bounds tricks, frame-perfect shortcuts. What's the abusive-but-legal path through this problem?",
    tags: ["code", "wild"],
  },
  {
    id: "ant-colony",
    label: "Ant colony / swarm",
    prompt:
      "No central planner. Many dumb agents, local rules, pheromone trails. How does the problem solve itself emergently?",
    tags: ["code", "wild"],
  },
  {
    id: "ops-3am",
    label: "On-call at 3am",
    prompt:
      "You're the on-call engineer woken at 3am when this thing breaks. What design would let you not get paged? What's the runbook-shaped solution?",
    tags: ["code", "design"],
  },
];

// Fisher-Yates shuffle — uniform distribution, unlike sort(() => Math.random() - 0.5).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick N frames for a run. Bias toward engineering tags when codeMode is on,
// but always include at least one wildcard so divergence stays weird.
export function selectFrames(n: number, codeMode = true): Frame[] {
  const pool = codeMode
    ? FRAMES.filter((f) => f.tags.includes("code") || f.tags.includes("design"))
    : [...FRAMES];
  const wild = FRAMES.filter((f) => f.tags.includes("wild"));

  const shuffled = shuffle(pool);
  const picked = shuffled.slice(0, Math.max(1, n - 1));
  const wildPick = wild[Math.floor(Math.random() * wild.length)];
  if (!picked.find((f) => f.id === wildPick.id)) picked.push(wildPick);
  return picked.slice(0, n);
}
