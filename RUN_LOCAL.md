# Running Maternal IA locally for a demo video

Tested on Linux and macOS. Python 3.10 or newer.

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

Open http://localhost:8000 in your browser. You will see:

- a state selector (9 states across pregnancy and postpartum)
- a transcript textarea
- three preset buttons: **Green example**, **Yellow example**,
  **Red example**
- a **Run check-in** button

Click a preset, click Run, and the page renders the FSM verdict, the
assistant message, follow-up questions, and the doctor summary card
when the triage is red.

## 5. Run the headless demo (no browser)

```bash
python demo/scenarios.py
```

This prints the three scenarios in your terminal. Useful if you want
a screen recording without a browser.

## 6. Run the safety tests

```bash
pip install pytest
pytest tests/ -v
```

You should see 17 passing tests. These tests lock down the safety
contract: the deterministic guardrails always escalate the listed red
phrases, the FSM is exactly 9 states, and red can never be downgraded.

## 7. Suggested 60-second screen recording flow

Window 1: terminal with `uvicorn ... --port 8000` running so the
server is visible.

Window 2: browser on http://localhost:8000.

1. Pick the state `Risk Detection (pregnancy)`. Click **Red example**.
   Click **Run check-in**. Triage badge turns red. Doctor summary
   card opens.
2. Pick `Emotional Adjustment (postpartum)`. Click **Yellow example**.
   Click **Run check-in**. Badge says red (deterministic override
   from the phrase "hurt myself" inside the user's denial sentence -
   conservative bias for safety; this is the architecture point).
3. Pick `Positive Test (pregnancy)`. Click **Green example**. Click
   **Run check-in**. Practical advice, no escalation.

Total 50 to 60 seconds. Stop the screen recorder.

## Troubleshooting

**OPENAI_API_KEY is required**: you did not `export` the variables
after editing `.env`. Re-run `export $(grep -v '^#' .env | xargs)`.

**Gradium 401**: the Gradium key is only used by the audio endpoints
(`/checkin_audio` and the `speak` flag). The text demo at `/` does
not call Gradium, so an invalid key does not block the recording.

**Port already in use**: change `--port 8000` to `--port 8080` (or
any free port).
