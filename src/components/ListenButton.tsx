"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  EXPERIMENT_NAME,
  getVariant,
  recordStat,
  type Variant,
} from "@/lib/experiment";
import { trackEvent } from "@/lib/track";
import styles from "./ListenButton.module.css";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

function getLabels(variant: Variant, minutes: number): Record<Status, string> {
  return {
    // A is the control. B is the same button with the listening time.
    idle:
      variant === "B" ? `Listen, ${minutes} min` : "Listen to this article",
    loading: "Preparing audio...",
    playing: "Pause",
    paused: "Resume",
    error: "Try again",
  };
}

export default function ListenButton({
  articleId,
  minutes,
}: {
  articleId: string;
  minutes: number;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const viewedRef = useRef(false);
  const clickedRef = useRef(false);

  // null on the server, "A" or "B" in the browser.
  const variant = useSyncExternalStore<Variant | null>(
    () => () => {},
    getVariant,
    () => null,
  );

  // Every event carries the variant, so results can be split by group later.
  const base = { article_id: articleId, variant: variant ?? "A" };

  useEffect(() => {
    if (!variant || viewedRef.current) return;
    viewedRef.current = true;
    recordStat(variant, "views");
    trackEvent("experiment_view", {
      experiment: EXPERIMENT_NAME,
      article_id: articleId,
      variant,
    });
  }, [variant, articleId]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function fail(reason: string) {
    setMessage(reason);
    setStatus("error");
    trackEvent("listen_error", { ...base, reason });
  }

  async function loadAudio(): Promise<HTMLAudioElement | null> {
    if (audioRef.current) return audioRef.current;

    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not load the audio.");
      }

      const url = URL.createObjectURL(await response.blob());
      urlRef.current = url;
      const audio = new Audio(url);
      audio.addEventListener("ended", () => {
        audio.currentTime = 0;
        setStatus("idle");
        trackEvent("listen_complete", base);
      });
      audioRef.current = audio;
      return audio;
    } catch (error) {
      fail(
        error instanceof Error ? error.message : "Could not load the audio.",
      );
      return null;
    }
  }

  async function handleClick() {
    if (status === "loading") return;

    if (status === "playing") {
      const audio = audioRef.current;
      audio?.pause();
      setStatus("paused");
      trackEvent("listen_pause", {
        ...base,
        position_seconds: Math.round(audio?.currentTime ?? 0),
      });
      return;
    }

    // Resume after a pause is not a new listen, so it must not count as a click.
    // Otherwise one person could be counted as three clicks in the listen rate.
    const isResume = status === "paused";
    if (!isResume) {
      // The table counts a visit once, even if the person clicks again later.
      if (variant && !clickedRef.current) {
        clickedRef.current = true;
        recordStat(variant, "clicks");
      }
      trackEvent("listen_click", base);
    }
    const audio = await loadAudio();
    if (!audio) return;

    try {
      await audio.play();
      setStatus("playing");
      if (isResume) {
        trackEvent("listen_resume", {
          ...base,
          position_seconds: Math.round(audio.currentTime),
        });
      } else {
        trackEvent("listen_play", base);
      }
    } catch {
      fail("The browser blocked audio playback.");
    }
  }

  // The variant is only known in the browser. Until then we keep the space free,
  // so the page does not jump and nobody sees the wrong button for a moment.
  if (!variant) {
    return <div className={styles.wrapper} aria-hidden="true" />;
  }

  const labels = getLabels(variant, minutes);

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={handleClick}
        disabled={status === "loading"}
        aria-busy={status === "loading"}
      >
        <span aria-hidden="true" className={styles.icon}>
          {status === "playing" ? "❚❚" : "▶"}
        </span>

        {labels[status]}
      </button>

      <p className={styles.message} role="status" aria-live="polite">
        {status === "error" ? message : ""}
      </p>
    </div>
  );
}
