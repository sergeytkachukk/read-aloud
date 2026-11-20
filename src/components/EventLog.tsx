"use client";

import { useEffect, useState } from "react";
import { TRACK_EVENT_NAME, type TrackedEvent } from "@/lib/track";
import styles from "./EventLog.module.css";

const MAX_ROWS = 8;

export default function EventLog() {
  const [events, setEvents] = useState<TrackedEvent[]>([]);

  useEffect(() => {
    function onTrack(event: Event) {
      const detail = (event as CustomEvent<TrackedEvent>).detail;
      setEvents((previous) => [detail, ...previous].slice(0, MAX_ROWS));
    }
    window.addEventListener(TRACK_EVENT_NAME, onTrack);
    return () => window.removeEventListener(TRACK_EVENT_NAME, onTrack);
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="event-log-title">
      <h2 id="event-log-title" className={styles.title}>
        Tracked events
      </h2>

      <p className={styles.note}>
        Every click is also pushed to <code>window.dataLayer</code>, so Google
        Tag Manager or GA4 can collect it.
      </p>
      {events.length === 0 ? (
        <p className={styles.empty}>Nothing yet. Press the button above.</p>
      ) : (
        <ul className={styles.list}>
          {events.map((event) => (
            <li key={`${event.at}-${event.name}`} className={styles.row}>
              <time className={styles.time}>
                {new Date(event.at).toLocaleTimeString()}
              </time>

              <span className={styles.name}>{event.name}</span>

              <span className={styles.params}>
                {Object.entries(event.params)
                  .map(([key, value]) => `${key}=${value}`)
                  .join(" ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
