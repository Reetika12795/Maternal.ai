# MATERNAL ai Prototype

Functional hackathon prototype for a voice-first maternal safety-net agent.

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Test Without API Keys

The app works in demo fallback mode with typed transcripts and browser speech synthesis.

Use the demo buttons:

- Green demo: nausea and nutrition.
- Yellow demo: postpartum emotional adjustment.
- Red demo: headache, vision changes, swelling.

## Live Environment

Create a local `.env.local` or export environment variables before running.

Required for OpenAI live structured triage:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Optional provider adapters:

```bash
GRADIUM_API_KEY=
GRADIUM_STT_URL=
GRADIUM_TTS_URL=
SLNG_API_KEY=
SLNG_AGENT_ID=
SLNG_BASE_URL=
PIONEER_API_KEY=
PIONEER_API_URL=
FAL_KEY=
FAL_API_URL=
```

Secrets are intentionally ignored by git.

If secrets were pasted into chat or a shared document during the hackathon, treat them as exposed and rotate them after the demo.

Note: this prototype includes adapters for SLNG, Pioneer, Gradium, fal.ai, and OpenAI. Only OpenAI works without provider-specific endpoint URLs. Gradium, SLNG, Pioneer, and fal.ai adapters are wired to environment variables so the exact hackathon endpoints can be added without changing the app flow.

## Architecture

```text
User text or voice
  -> Browser / Gradium STT adapter
  -> BLOOM phase context
  -> OpenAI structured triage
  -> Deterministic maternal guardrails
  -> Local memory
  -> SLNG escalation adapter for red cases
  -> Browser / Gradium TTS adapter
```

## Safety

The prototype does not diagnose. Red/yellow/green triage is a safety-routing concept for the demo. Urgent symptoms trigger clear escalation language and a clinician-facing summary.
