# Maternal IA

Protocol-bound maternal follow-up assistant. Voice-first. Built on a
deterministic state machine, with the LLM constrained to a structured
response inside the active card. Deterministic red-flag rules sit on
top of the model and cannot be overridden by it.

## What it does

Maternal IA accompanies a mother from the day she sees a positive
pregnancy test, through delivery, and through the postpartum window
where postpartum depression and physical complications surface. It
runs a short natural-voice check-in, classifies the conversation as
green, yellow, or red, and prepares a clinician handoff when red.

Phase 1 covers six pregnancy states. Phase 2 covers three postpartum
states. The full FSM lives in
`maternal_ai/protocol/maternal_protocol.yaml`.

## Why a state machine, not a chatbot

A free-form medical chatbot has no audit boundary and no way to make
a safety guarantee. A state machine has both. Each card declares its
own goals, routine questions, and red and yellow flags. The LLM never
chooses the next state. The FSM does. Deterministic phrase matching
on the transcript can upgrade a triage verdict (yellow over green) or
override a soft model verdict (red on a self-harm phrase). The LLM
can never downgrade a deterministic signal.

This is the same architecture pattern shipped in regulated voice AI
(VoxPath, Pipecat-based pipelines). Maternal IA reuses the FSM and
guardrail philosophy and applies it to maternal follow-up.

## Technology partners

This project uses:

- **OpenAI** for structured reasoning. The model produces a strict
  JSON object that names symptoms, emotional signals, a triage
  candidate, an assistant utterance, follow-up questions, a doctor
  summary, and a memory update. No free-form generation reaches the
  user without the schema check.
- **Slng.ai** as the global voice agent infrastructure for session
  routing and clinician handoff. The repository ships a local
  `routeEscalation` stub that matches the SLNG payload shape so the
  swap is one file.
- **Gradium** for realtime STT and TTS. Low-latency speech in and
  out, with semantic voice activity detection so the assistant takes
  turns like a person.
- **fal** as the generative media platform for future visual
  collateral and patient-facing media assets.
- **Pioneer by Fastino Labs** for small task-tuned models that train
  themselves. The roadmap uses Pioneer to fine-tune a French maternal
  vocabulary head on top of the base STT.
- **Tavily** for real-time search and verified extraction of clinical
  references when the assistant needs to surface a public protocol.

## Architecture

```
microphone
   -> Gradium STT
   -> FSM state resolver (maternal_ai/fsm.py)
   -> OpenAI Responses API with strict JSON schema (maternal_ai/llm.py)
   -> deterministic triage guardrails (maternal_ai/fsm.py + pipeline.py)
   -> escalation hook to SLNG or local stub (maternal_ai/pipeline.py)
   -> Gradium TTS
   -> speaker
```

The state machine is loaded once at boot from the protocol YAML. Each
turn is a function call, not a long conversation. State is owned by
the application, not the model.

## Repository layout

```
maternal_ai/
  __init__.py
  fsm.py                       state machine and deterministic guardrails
  llm.py                       OpenAI Responses wrapper with strict schema
  voice.py                     Gradium STT and TTS clients (official SDK)
  pipeline.py                  end-to-end check-in pipeline
  protocol/
    maternal_protocol.yaml     9-state FSM and red/yellow phrase lists
  api/
    server.py                  FastAPI service: /checkin (text) and /voice (audio)
  static/
    index.html                 web UI with hold-to-talk mic capture and auto playback
demo/
  scenarios.py                 three scripted check-ins (green, yellow, red)
tests/
  test_fsm.py                  unit tests for the safety contract
```

## Running locally

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill OPENAI_API_KEY and GRADIUM_API_KEY in .env
export $(grep -v '^#' .env | xargs)

# Three scripted demos against the live OpenAI API:
python demo/scenarios.py

# Web UI and HTTP API:
uvicorn maternal_ai.api.server:app --reload --port 8000
# open http://localhost:8000
```

The static page at `/` is the live voice demo. Pick a state, hold the
microphone button, speak, release Stop. The browser uploads the WebM
blob to `POST /voice`. The server converts it to WAV via ffmpeg,
runs Gradium STT, runs the FSM and the OpenAI structured call,
resolves deterministic overrides, synthesises the assistant reply
with Gradium TTS, and returns one JSON payload with the audio
embedded as base64. The browser auto-plays the reply and renders the
triage verdict, the transcript, and the raw response.

A text fallback is also provided: type instead of speak, the
assistant still answers with synthesised audio.

See `RUN_LOCAL.md` for a step-by-step laptop setup, including the
ffmpeg dependency and the suggested 60-second screen-recording flow.

## Safety contract

Tests in `tests/test_fsm.py` lock down the safety contract:

- The protocol loads exactly nine states, six pregnancy and three
  postpartum.
- The FSM chain is linear and terminates at `s9_long_term_wellbeing`.
- Self-harm, baby-harm, chest pain, vision changes with swelling, and
  the other listed red phrases always classify as red.
- The deterministic override resolver never downgrades a red signal.

If any of these tests breaks, the safety story breaks. CI should fail
fast.

## Demo script for the 60-second pitch

1. Open the web UI. Pick `Risk Detection (pregnancy)`. Hold the mic.
   Say "I have a bad headache and my vision is blurry since this
   morning". Stop. The triage badge turns red, the assistant speaks
   the urgent-care instruction back, an escalation record is written.
2. Pick `Emotional Adjustment (postpartum)`. Hold the mic. Say "I
   feel like a bad mother. I would never hurt myself but it is
   getting harder every day". Stop. The badge turns red with a
   deterministic override marker. The substring "hurt myself" wins
   even inside a denial sentence: that is the safety bias.
3. Pick `Positive Test (pregnancy)`. Hold the mic. Say "I am
   thirteen weeks pregnant, a bit nauseous in the mornings".
   Stop. Green. Practical advice. No escalation.

That is the architecture: one FSM, three triage colors, one
auditable trail per turn, voice in and voice out.

## Roadmap

- Wire SLNG as the real escalation route.
- Replace the file-upload STT call with the Gradium WebSocket so
  turn-taking is sub-second.
- Fine-tune a French maternal vocabulary head on Pioneer.
- Add long-term memory store (Supabase or SQLite) for cross-session
  mood trend.
- Connect Tavily for verified clinical reference snippets when the
  assistant needs to surface a public protocol.

## License

Hackathon prototype. Not a medical device. Does not diagnose. Does
not replace emergency services, a midwife, or a clinician.
