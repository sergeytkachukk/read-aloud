"use client";

import { useSyncExternalStore } from "react";
import {
  getVariant,
  parseStats,
  readStatsRaw,
  resetStats,
  STATS_EVENT_NAME,
  type Variant,
} from "@/lib/experiment";
import styles from "./ExperimentStats.module.css";

function subscribe(onChange: () => void) {
  window.addEventListener(STATS_EVENT_NAME, onChange);
  return () => window.removeEventListener(STATS_EVENT_NAME, onChange);
}

function formatRate(clicks: number, views: number): string {
  if (views === 0) return "-";
  return `${Math.round((clicks / views) * 100)}%`;
}

export default function ExperimentStats() {
  // "" on the server, the saved numbers in the browser.
  const raw = useSyncExternalStore(subscribe, readStatsRaw, () => "");
  const current = useSyncExternalStore<Variant | null>(
    () => () => {},
    getVariant,
    () => null,
  );
  const stats = parseStats(raw);

  return (
    <section className={styles.panel} aria-labelledby="experiment-title">
      <h2 id="experiment-title" className={styles.title}>
        A/B test: button text
      </h2>
      <p className={styles.note}>
        A says &quot;Listen to this article&quot;. B adds the listening time.
        {current ? ` You are in variant ${current}.` : ""} Add{" "}
        <code>?variant=A</code> or <code>?variant=B</code> to the address to see
        the other one. These numbers live in this browser only.
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Variant</th>
            <th scope="col">Visits</th>
            <th scope="col">Clicked</th>
            <th scope="col">Listen rate</th>
          </tr>
        </thead>
        <tbody>
          {(["A", "B"] as const).map((variant) => (
            <tr key={variant}>
              <th scope="row">{variant}</th>
              <td>{stats[variant].views}</td>
              <td>{stats[variant].clicks}</td>
              <td>{formatRate(stats[variant].clicks, stats[variant].views)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className={styles.reset} onClick={resetStats}>
        Reset numbers
      </button>
    </section>
  );
}
