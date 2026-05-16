# MATERNAL ai

Voice-first maternal safety-net prototype for pregnancy and postpartum follow-up.

MATERNAL ai is not a generic pregnancy chatbot. It is a protocol-bound conversational agent that follows a mother through the BLOOM maternal journey, remembers patient history, classifies risk as green/yellow/red, and creates a doctor-ready escalation summary when red flags appear.

## What This Prototype Shows

- Voice-first check-ins using Gradium STT.
- Spoken assistant responses using Gradium TTS.
- OpenAI structured maternal triage.
- BLOOM phase-aware questioning.
- Persistent per-patient history in local JSON storage.
- Longitudinal mood, confidence, symptom, and signal tracking.
- Deterministic red-flag guardrails on top of the model.
- Doctor escalation payloads for urgent cases.
- Desktop demo UI with dynamic voice/triage/memory visuals.

## Core Flow

```text
Mother speaks or types a check-in
  -> Gradium STT turns voice into text
  -> BLOOM phase context is loaded
  -> Patient history is loaded
  -> OpenAI returns structured JSON triage
  -> deterministic guardrails override unsafe misses
  -> memory is updated
  -> red cases create doctor escalation summaries
  -> Gradium TTS can speak the response back
```

## Run Locally

```bash
cd /Users/reegauta/Documents/Maternal.ai
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

If port `3000` is busy:

```bash
PORT=3001 npm run dev
```

Then open:

```text
http://127.0.0.1:3001
```

## Environment Variables

Create `.env` from `.env.example` and fill your keys locally.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

GRADIUM_API_KEY=
GRADIUM_STT_URL=https://api.gradium.ai/api/post/speech/asr
GRADIUM_TTS_URL=https://api.gradium.ai/api/post/speech/tts
GRADIUM_VOICE_ID=YTpq7expH9539ERJ

SLNG_API_KEY=
SLNG_AGENT_ID=
SLNG_BASE_URL=

PIONEER_API_KEY=
PIONEER_API_URL=

FAL_KEY=
FAL_API_URL=
```

Secrets are ignored by git. Do not commit `.env`.

## Demo Buttons

The UI includes three preset flows:

- **Positive test**: practical early pregnancy support.
- **PPD trend**: postpartum emotional monitoring and memory update.
- **Emergency**: late-pregnancy red flag escalation.

For voice testing:

1. Click the large microphone orb.
2. Allow microphone permission.
3. Speak the check-in.
4. Click the mic again to stop.
5. Wait for Gradium transcription.
6. Click **Send check-in**.
7. Click **Speak latest response** to hear TTS.

## API Endpoints

```text
GET  /api/health
GET  /api/history?patientId=demo-mother
POST /api/history/reset
POST /api/checkin
POST /api/transcribe
POST /api/speak
POST /api/visual
```

## Local Data

Runtime data is stored under `data/`:

```text
data/memory.json
data/checkins.jsonl
data/escalations.jsonl
data/pioneer-events.jsonl
```

The `data/` directory is ignored by git.

## Safety Position

This is a hackathon prototype, not a medical device.

The assistant must not diagnose, replace a doctor, replace emergency services, or replace clinical care. Red/yellow/green triage is a safety-routing mechanism for demo purposes. The deterministic guardrail layer exists so obvious red flags cannot be silently downgraded by the model.

## Verify

```bash
npm run check
node --check public/app.js
node --check server.mjs
```

## Free Hosting Recommendation

Use Render Free Web Service for this prototype because it runs a normal Node server. Set:

```text
Build Command: npm install
Start Command: npm run start
Environment: Node
```

Add the same environment variables from `.env` in the Render dashboard.

