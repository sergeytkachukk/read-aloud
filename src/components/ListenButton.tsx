"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/track";
import styles from "./ListenButton.module.css";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

const LABELS: Record<Status, string> = {
  idle: "Listen to this article",
  loading: "Preparing audio...",
  playing: "Pause",
  paused: "Resume",
  error: "Try again",
};

export default function ListenButton({ articleId }: { articleId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function fail(reason: string) {
    setMessage(reason);
    setStatus("error");
    trackEvent("listen_error", { article_id: articleId, reason });
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
        trackEvent("listen_complete", { article_id: articleId });
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
        article_id: articleId,
        position_seconds: Math.round(audio?.currentTime ?? 0),
      });
      return;
    }

    // Resume after a pause is not a new listen, so it must not count as a click.
    // Otherwise one person could be counted as three clicks in the listen rate.
    const isResume = status === "paused";
    if (!isResume) trackEvent("listen_click", { article_id: articleId });
    const audio = await loadAudio();
    if (!audio) return;

    try {
      await audio.play();
      setStatus("playing");
      if (isResume) {
        trackEvent("listen_resume", {
          article_id: articleId,
          position_seconds: Math.round(audio.currentTime),
        });
      } else {
        trackEvent("listen_play", { article_id: articleId });
      }
    } catch {
      fail("The browser blocked audio playback.");
    }
  }

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

        {LABELS[status]}
      </button>

      <p className={styles.message} role="status" aria-live="polite">
        {status === "error" ? message : ""}
      </p>
    </div>
  );
}
