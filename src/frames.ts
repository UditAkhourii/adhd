import { core } from "./packs/core.js";

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

// Packs are looked up by name at selection time, so a pack added to this
// object is selectable without touching selectFrames.
export const PACKS: Record<string, Frame[]> = { core };

export const FRAMES: Frame[] = core;

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
export function selectFrames(n: number, codeMode = true, packs = ["core"]): Frame[] {
  // Without this an empty list pools nothing and the core wild fallback turns
  // it into a one-frame run.
  if (packs.length === 0) throw new Error("selectFrames needs at least one pack name");
  const named = [...new Set(packs)].map((name) => {
    if (!Object.hasOwn(PACKS, name)) {
      throw new Error(`Unknown frame pack "${name}". Available packs: ${Object.keys(PACKS).join(", ")}`);
    }
    return PACKS[name];
  });
  // By id, so a pack that reuses another pack's frame can't put it in a run twice.
  const unique = (list: Frame[]) => [...new Map(list.map((f) => [f.id, f])).values()];
  const frames = unique(named.flat());
  // Narrowed per pack: a pack written for a non-engineering domain may have no
  // code or design frame, and narrowing it would drop it even when pooled with core.
  const pool = codeMode
    ? unique(named.flatMap((p) => {
        const engineering = p.filter((f) => f.tags.includes("code") || f.tags.includes("design"));
        return engineering.length > 0 ? engineering : p;
      }))
    : frames;
  const pooledWild = frames.filter((f) => f.tags.includes("wild"));
  const wild = pooledWild.length > 0 ? pooledWild : FRAMES.filter((f) => f.tags.includes("wild"));

  const shuffled = shuffle(pool);
  const picked = shuffled.slice(0, Math.max(1, n - 1));
  const wildPick = wild[Math.floor(Math.random() * wild.length)];
  if (!picked.find((f) => f.id === wildPick.id)) picked.push(wildPick);
  return picked.slice(0, n);
}
