# Read Aloud

A small Next.js and TypeScript demo. A page has a "Listen to this article" button that reads the article aloud with the ElevenLabs text-to-speech API. Each interaction is tracked as an event, the way a growth team would measure a new feature.

## What it shows

- A server route (`/api/speech`) that keeps the API key on the server and never in the browser.
- The browser sends an article id, not free text, so the public endpoint cannot be used to voice arbitrary content with your credits. Audio is cached per article and requests are rate limited per IP.
- A client button with clear states (idle, loading, playing, paused, error).
- Event tracking: `listen_click`, `listen_play`, `listen_pause`, `listen_resume`, `listen_complete`, `listen_error`. Events are pushed to `window.dataLayer` (ready for Google Tag Manager or GA4) and shown live on the page.

## Run it

```bash
npm install
cp .env.example .env.local   # then add your ElevenLabs API key
npm run dev
```

Open http://localhost:3000 and press the button.

## Settings

| Variable | Required | Meaning |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | yes | Your ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | no | Voice to use, defaults to a premade voice |
| `ELEVENLABS_MODEL_ID` | no | Defaults to `eleven_multilingual_v2` |

## Next ideas

- Run the button as an A/B test with a feature flag and compare listen rate and time on page.
- Send the events to GA4 through Google Tag Manager.
- Add more articles and voices.
