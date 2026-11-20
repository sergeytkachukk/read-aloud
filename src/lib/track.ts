export type TrackParams = Record<string, string | number | boolean>;

export type TrackedEvent = {
  name: string;
  params: TrackParams;
  at: number;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export const TRACK_EVENT_NAME = "read-aloud:track";

/**
 * Sends an event to the page's dataLayer, so Google Tag Manager or GA4 can pick
 * it up, and also broadcasts it inside the page so the demo can show it live.
 */
export function trackEvent(name: string, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: name, ...params });

  const detail: TrackedEvent = { name, params, at: Date.now() };
  window.dispatchEvent(new CustomEvent<TrackedEvent>(TRACK_EVENT_NAME, { detail }));
}
