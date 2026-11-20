/**
 * A tiny home-made feature flag for one A/B test.
 *
 * Test: does a button text with the listening time ("Listen, 1 min") get more
 * clicks than the plain text ("Listen to this article")?
 *
 * The variant is chosen at random once and saved in the browser, so a visitor
 * always sees the same button. The numbers are saved in the browser too, so they
 * only describe this browser. In a real project the same events would go to
 * GA4 or GrowthBook, which count all visitors together.
 */

export type Variant = "A" | "B";

export type VariantStats = { views: number; clicks: number };
export type Stats = Record<Variant, VariantStats>;

export const EXPERIMENT_NAME = "listen_button_text";
export const STATS_EVENT_NAME = "read-aloud:stats";

const VARIANT_KEY = "read-aloud:variant";
const STATS_KEY = "read-aloud:stats";

function isVariant(value: unknown): value is Variant {
  return value === "A" || value === "B";
}

// Storage can be blocked (private mode), so every access is wrapped.
function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Nothing to do. The page still works without saving.
  }
}

let cachedVariant: Variant | null = null;

function chooseVariant(): Variant {
  // "?variant=A" or "?variant=B" in the address forces a variant, for testing.
  const forced = new URLSearchParams(window.location.search)
    .get("variant")
    ?.toUpperCase();
  if (isVariant(forced)) {
    writeStorage(VARIANT_KEY, forced);
    return forced;
  }

  const saved = readStorage(VARIANT_KEY);
  if (isVariant(saved)) return saved;

  const random: Variant = Math.random() < 0.5 ? "A" : "B";
  writeStorage(VARIANT_KEY, random);
  return random;
}

/** Browser only. Returns the same answer every time during one page visit. */
export function getVariant(): Variant {
  cachedVariant ??= chooseVariant();
  return cachedVariant;
}

export function readStatsRaw(): string {
  return readStorage(STATS_KEY) ?? "";
}

export function parseStats(raw: string): Stats {
  const stats: Stats = {
    A: { views: 0, clicks: 0 },
    B: { views: 0, clicks: 0 },
  };
  if (!raw) return stats;
  try {
    const data = JSON.parse(raw) as Partial<Stats>;
    for (const variant of ["A", "B"] as const) {
      stats[variant].views = Number(data[variant]?.views) || 0;
      stats[variant].clicks = Number(data[variant]?.clicks) || 0;
    }
  } catch {
    // Broken data, start from zero.
  }
  return stats;
}

export function recordStat(variant: Variant, field: keyof VariantStats): void {
  const stats = parseStats(readStatsRaw());
  stats[variant][field] += 1;
  writeStorage(STATS_KEY, JSON.stringify(stats));
  window.dispatchEvent(new Event(STATS_EVENT_NAME));
}

export function resetStats(): void {
  writeStorage(STATS_KEY, "");
  window.dispatchEvent(new Event(STATS_EVENT_NAME));
}
