# Running Maternal IA locally for a demo video

Tested on Linux and macOS. Python 3.10 or newer. `ffmpeg` must be
installed and on `PATH` (it is used to convert browser MediaRecorder
WebM uploads to WAV before they hit Gradium STT).

## 1. Clone the branch

```bash
git clone -b vpimshin git@github.com:Reetika12795/Maternal.ai.git
cd Maternal.ai
```

(or `https://github.com/Reetika12795/Maternal.ai.git` if you do not
have an SSH key configured)

## 2. Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate          # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

System packages:

```bash
# Debian / Ubuntu
sudo apt-get install -y ffmpeg
# macOS
brew install ffmpeg
```

## 3. Configure API keys

```bash
cp .env.example .env
```

Open `.env` and fill in:

```
OPENAI_API_KEY=sk-proj-...
GRADIUM_API_KEY=gsk_...
```

Export them into the shell:

```bash
export $(grep -v '^#' .env | xargs)
```

(or on Windows PowerShell:
`Get-Content .env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { Set-Item "env:$($matches[1])" $matches[2] } }`)

## 4. Run the web demo

```bash
uvicorn maternal_ai.api.server:app --reload --port 8000
```

Open http://localhost:8000 in your browser (Chrome recommended; the
mic recorder uses the standard `MediaRecorder` API). You will see:

- a state selector (9 states across pregnancy and postpartum)
- a big red **Hold to talk** button and a **Stop** button
- a text fallback area for typed input
- a conversation panel that builds up across turns
- a triage badge (green / yellow / red) with a deterministic override
  marker when the safety word list fires
- the raw JSON response from the server

### Full voice turn flow

1. Click **Hold to talk**. Grant microphone permission once.
2. Speak the patient utterance (10 to 20 seconds is plenty).
3. Click **Stop**.
4. The browser uploads the WebM blob to `POST /voice`. The server:
   - converts the audio to WAV with ffmpeg,
   - sends it to Gradium STT,
   - runs the FSM state + the OpenAI structured-output call,
   - resolves deterministic guardrail overrides,
   - synthesises the assistant reply with Gradium TTS,
   - returns one JSON payload with a base64-encoded WAV embedded.
5. The browser auto-plays the WAV and renders the transcript, the
   assistant message, and the triage verdict.
6. The last six turns of memory are passed back to the server on each
   new turn so the assistant has short-term context.

### Text fallback

If the demo room is too noisy or the mic is blocked, the **Text
fallback** card calls `POST /checkin` with `speak=true`. The flow is
identical except the patient side is typed instead of spoken; the
assistant reply is still synthesised and auto-played.

## 5. Run the headless demo (no browser, no mic)

```bash
python demo/scenarios.py
```

This prints three deterministic scenarios in your terminal. Useful
when recording a screencast without browser audio.

## 6. Run the safety tests

```bash
pip install pytest
pytest tests/ -v
```

You should see 17 passing tests. These tests lock down the safety
contract: the deterministic guardrails always escalate the listed red
phrases, the FSM is exactly 9 states, and red can never be downgraded.

## 7. Suggested 60-second screen recording flow

Window 1: terminal with `uvicorn ... --port 8000` running.

Window 2: Chrome on http://localhost:8000.

1. Pick `Risk Detection (pregnancy)`. Hold to talk. Say:
   "I have had a bad headache and blurry vision since this morning,
   and my hands feel swollen." Stop. Triage flips to **red**, the
   assistant says it out loud, escalation is logged in the terminal.
2. Pick `Emotional Adjustment (postpartum)`. Hold to talk. Say:
   "I feel like a bad mother. I would never hurt myself but it is
   getting harder every day." Stop. Triage is **red** with a
   deterministic override badge. This is the safety bias point:
   the substring `hurt myself` triggers escalation even inside a
   denial sentence.
3. Pick `Positive Test (pregnancy)`. Hold to talk. Say:
   "I am thirteen weeks pregnant, feeling a little nauseous in the
   mornings but otherwise fine." Stop. Triage is **green**, the
   assistant gives practical advice.

Total 50 to 60 seconds.

## Troubleshooting

**OPENAI_API_KEY is required**: you did not `export` the variables
after editing `.env`. Re-run `export $(grep -v '^#' .env | xargs)`.

**Gradium 401 / Gradium STT failed**: bad or missing `GRADIUM_API_KEY`.
The text fallback at `/checkin` without `speak=true` does not call
Gradium, so you can still demo the FSM logic.

**ffmpeg is required to convert non-WAV uploads**: install ffmpeg
(see step 2).

**Microphone permission denied**: open Chrome settings, allow
microphone for `http://localhost:8000`, refresh the page.

**Autoplay blocked**: click anywhere on the page once before the
first recording; Chrome unlocks audio playback after a user gesture.

**Port already in use**: change `--port 8000` to any free port.
