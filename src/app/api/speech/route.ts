import type { NextRequest } from "next/server";
import { getArticle } from "@/content/articles";

const API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
// A premade ElevenLabs voice. Override with ELEVENLABS_VOICE_ID in .env.local.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

// Each demo article is fixed, so the audio is generated once and reused.
const audioCache = new Map<string, ArrayBuffer>();

// Very small per-IP limit. It protects your credits if the demo is public.
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const recentRequests = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (recentRequests.get(ip) ?? []).filter(
    (time) => now - time < WINDOW_MS,
  );
  recent.push(now);
  recentRequests.set(ip, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return jsonError(
      "The server has no ELEVENLABS_API_KEY. Add it to .env.local and restart.",
      500,
    );
  }

  let articleId: unknown;
  try {
    const body: unknown = await request.json();
    articleId =
      typeof body === "object" && body !== null && "articleId" in body
        ? (body as { articleId: unknown }).articleId
        : undefined;
  } catch {
    return jsonError("Send a JSON body with an articleId.", 400);
  }

  const article =
    typeof articleId === "string" ? getArticle(articleId) : undefined;
  if (!article) {
    return jsonError("Unknown article.", 404);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(ip)) {
    return jsonError("Too many requests. Please wait a minute.", 429);
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;
  const cacheKey = `${article.id}:${voiceId}:${modelId}`;

  let audio = audioCache.get(cacheKey);
  if (!audio) {
    const response = await fetch(
      `${API_URL}/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text: article.text, model_id: modelId }),
      },
    );

    if (!response.ok) {
      // Log the status only. Never log the key or the full upstream body.
      console.error(`ElevenLabs request failed with status ${response.status}`);
      if (response.status === 401) {
        return jsonError("ElevenLabs rejected the API key.", 502);
      }
      if (response.status === 402 || response.status === 429) {
        return jsonError("ElevenLabs credits or rate limit reached.", 502);
      }
      return jsonError("The speech service could not create the audio.", 502);
    }

    audio = await response.arrayBuffer();
    audioCache.set(cacheKey, audio);
  }

  return new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
