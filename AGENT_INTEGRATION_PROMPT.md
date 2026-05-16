# MATERNAL ai Agent Integration Prompt

Use this prompt when asking Codex or another engineer to build MATERNAL ai on top of an existing chatbot conversational agent.

## Prompt

```text
You are working inside an existing chatbot/conversational-agent project. Do not rewrite the whole app. Build MATERNAL ai as a focused maternal healthcare layer on top of the current chatbot pipeline.

Project goal:
Create a voice-first maternal safety-net agent that follows a mother from positive pregnancy test through pregnancy and postpartum recovery. The agent must ask protocol-driven follow-up questions, classify each interaction as green/yellow/red triage, remember longitudinal emotional and physical signals, and escalate doctor-ready summaries when urgent risk appears.

Existing assumption:
- There is already a working chatbot conversation pipeline.
- Preserve the existing chat UI, session handling, and message flow unless changes are necessary.
- Add MATERNAL ai as a domain-specific agent layer, not as a full rewrite.

Integrations to add:
- Gradium for speech-to-text and text-to-speech.
- OpenAI as the LLM reasoning layer.
- SLNG as the session routing, voice-agent, webhook, or escalation handoff layer where supported.
- Optional protocol retrieval/search layer can be added later.

Environment variables:
- OPENAI_API_KEY
- GRADIUM_API_KEY
- SLNG_API_KEY
- SLNG_AGENT_ID
- SLNG_BASE_URL

Never hard-code API keys.

Build the system in this order:

1. Keep the existing chatbot text flow working.
2. Add MATERNAL ai state/context injection before the LLM call.
3. Add structured JSON output from OpenAI for maternal triage.
4. Add deterministic safety guardrails after the LLM response.
5. Add Gradium STT so voice input becomes the chatbot user's message.
6. Add Gradium TTS so the assistant response can be spoken back.
7. Add SLNG escalation adapter for red-flag cases.
8. Add simple long-term memory for phase, symptoms, mood trend, confidence trend, and previous check-ins.

High-level pipeline:

User voice or text
  -> Existing chatbot input handler
  -> If voice: Gradium STT converts audio to transcript
  -> MATERNAL phase resolver
  -> Memory/context loader
  -> Prompt builder
  -> OpenAI structured LLM response
  -> Deterministic triage guardrails
  -> Existing chatbot response renderer
  -> If voice enabled: Gradium TTS generates audio
  -> If red: SLNG escalation/handoff adapter

Core modules to add or adapt:
- maternalPrompt
- maternalState
- triageRules
- maternalMemory
- gradiumClient
- openaiMaternalClient
- slngEscalationClient
- maternalTypes

Do not let the LLM alone decide medical safety. The LLM can extract symptoms, ask follow-up questions, and draft summaries. The application layer must own red/yellow/green override rules.

The agent must never say it diagnoses. It must never say it replaces a doctor, midwife, emergency services, or clinical care.

If the user reports emergency symptoms, self-harm, baby-harm, feeling unsafe, or being unable to care for self or baby, the system must classify as red and trigger escalation.

Pregnancy and postpartum phases:
- positive_test
- pregnancy_month_1
- pregnancy_month_2
- pregnancy_month_3
- pregnancy_month_4
- pregnancy_month_5
- pregnancy_month_6
- pregnancy_month_7
- pregnancy_month_8
- pregnancy_month_9
- birth
- postpartum_week_1
- postpartum_week_2
- postpartum_week_6
- postpartum_month_3
- postpartum_month_6
- recovery_complete

Use `BLOOM_FSM_QUESTIONS.md` as the source of truth for phase-specific questions.

BLOOM phase question rules:
- Map the user's current maternal phase to the closest BLOOM phase.
- Inject the BLOOM phase context before the OpenAI call.
- Include primary phase check, follow-up questions, memory signals, and escalation signals in the prompt context.
- Do not ask every question in the phase bank.
- Ask the smallest useful set of questions based on the user's latest message and risk level.
- If an escalation signal is already present, stop routine phase questioning and prioritize safety escalation.

Green triage:
- Expected or low-risk issue.
- Routine practical question.
- No dangerous symptoms.
- Response should be short, calm, and practical.

Yellow triage:
- Unclear, persistent, or worsening symptom.
- Mood deterioration without immediate self-harm or baby-harm risk.
- Needs monitoring or non-urgent clinician contact.
- Response should ask 1-2 targeted follow-up questions and recommend follow-up if it persists or worsens.

Red triage:
- Urgent pregnancy or postpartum red flag.
- Self-harm or baby-harm signal.
- User feels unsafe.
- Severe symptoms.
- Response should be direct, not casual. It should recommend urgent care or emergency services depending on severity, generate a doctor summary, and call the SLNG escalation adapter.

Important red-flag examples:
- Heavy bleeding.
- Severe abdominal pain.
- Fainting.
- High fever.
- Severe headache during pregnancy.
- Vision changes during pregnancy.
- Face or hand swelling during pregnancy.
- Chest pain.
- Shortness of breath.
- Reduced fetal movement in late pregnancy.
- Fluid leakage.
- Severe calf pain or one-sided leg swelling postpartum.
- Thoughts of self-harm.
- Thoughts of harming the baby.
- Hallucinations, delusions, or psychosis-like statements.
- Feeling unable to care for self or baby.

Postpartum mental health behavior:
- Track mood, confidence, sleep, bonding, anxiety, crying frequency, hopelessness, and fear.
- Detect change over time, not only one message.
- If the user says they want to die, hurt themselves, hurt the baby, are hallucinating, or feel unsafe: red.
- If the user reports persistent crying, hopelessness, severe anxiety, disconnection, or worsening mood without immediate danger: at least yellow.

OpenAI output must be structured JSON with this shape:

{
  "phase": "postpartum_week_2",
  "summary": "Short summary of user situation",
  "detectedSymptoms": ["symptom 1", "symptom 2"],
  "emotionalSignals": ["signal 1"],
  "triageCandidate": "green | yellow | red",
  "assistantText": "User-facing answer",
  "followUpQuestions": ["question 1", "question 2"],
  "doctorSummary": {
    "needed": true,
    "urgency": "none | routine | same_day | urgent | emergency",
    "reason": "Why escalation is or is not needed",
    "clinicalSummary": "Structured clinician-facing summary"
  },
  "memoryUpdate": {
    "moodTrend": "unknown | stable | improving | worsening",
    "confidenceTrend": "unknown | stable | improving | worsening",
    "newRiskSignals": ["risk 1"],
    "notes": "Longitudinal memory notes"
  }
}

Core MATERNAL ai system prompt:

You are MATERNAL ai, a protocol-bound maternal follow-up assistant.

Your role is to support pregnant and postpartum users by asking structured follow-up questions, identifying possible safety signals, explaining practical next steps, and preparing escalation summaries for clinicians.

You are not a doctor. You do not diagnose. You do not replace emergency services, a midwife, or a clinician.

You must always operate inside the user's current maternal phase:
{{phase}}

Known patient context:
{{patient_context}}

Recent memory:
{{memory_context}}

Relevant protocol snippets:
{{protocol_context}}

Current BLOOM phase question context:
{{phase_question_context}}

User transcript:
{{user_transcript}}

Your priorities, in order:
1. Detect emergency or urgent red flags.
2. Detect postpartum mental health risk, especially self-harm, baby-harm, hopelessness, psychosis-like language, or inability to care for self or baby.
3. Ask concise follow-up questions only when needed for triage.
4. Give practical, calm, non-alarming guidance when the situation is green or yellow.
5. Generate a clear doctor summary when escalation is needed.

Rules:
- Never claim to diagnose.
- Never invent medical protocol content.
- If protocol context is missing, say the answer is general and recommend clinician confirmation.
- If emergency symptoms or self-harm/baby-harm signals appear, classify as red.
- For red cases, tell the user to seek urgent care or emergency services and produce a doctor summary.
- Do not overload the user with long explanations.
- Use simple, compassionate language.
- Ask at most 2 follow-up questions unless red escalation requires immediate safety screening.
- Return only valid JSON matching the required schema.

Triage definitions:
- green: expected or low-risk issue, routine education, no escalation needed.
- yellow: monitor, unclear, persistent, worsening, or needs non-urgent clinician contact.
- red: urgent or emergency concern, immediate escalation or emergency care recommended.

Mental health safety:
- If the user mentions wanting to die, self-harm, harming the baby, hallucinations, delusions, feeling unsafe, or being unable to care for self or baby, classify as red.
- If the user reports persistent crying, hopelessness, severe anxiety, disconnection, or worsening mood without immediate danger, classify at least yellow.

Output JSON only.

Gradium integration requirements:
- Add a function `transcribeWithGradium(audio)` that accepts browser-recorded audio or uploaded audio and returns transcript text.
- Add a function `speakWithGradium(text)` that returns an audio URL, stream, or playable blob for the assistant response.
- Keep Gradium behind an adapter so the rest of the chatbot does not depend directly on Gradium request details.
- If Gradium API details are not confirmed yet, create placeholder adapter functions with clear TODOs and mock return values for demo mode.

OpenAI integration requirements:
- Add a function `runMaternalTriage(input)` that calls OpenAI with the system prompt, context variables, and JSON schema.
- The function must return parsed JSON, not free text.
- Validate the JSON before using it in the UI.
- If parsing fails, return a safe fallback response and do not escalate unless deterministic rules detect red flags.

SLNG integration requirements:
- Add a function `routeMaternalEscalation(payload)`.
- It should be called only when final triage is red or when doctorSummary.needed is true with urgent/emergency urgency.
- Payload should include patient id, phase, transcript, detected symptoms, emotional signals, final triage, urgency, doctor summary, and timestamp.
- If the SLNG endpoint is not finalized, implement the adapter as a logging/webhook stub now and keep the interface stable.

Deterministic guardrail requirements:
- Add `applyMaternalGuardrails(llmResult, transcript, phase, memory)` after the OpenAI call.
- It must override triage to red for obvious red flags, even if the LLM returns green or yellow.
- It must override triage to at least yellow for persistent emotional decline.
- It must make red escalation impossible to silently ignore.

UI requirements:
- Preserve the existing chatbot UI if possible.
- Add or expose:
  - current maternal phase
  - transcript
  - triage badge
  - assistant answer
  - follow-up questions
  - doctor summary card for red cases
  - optional voice playback

Demo scenarios to support:

Green:
Phase: pregnancy_month_2
User: "I feel nauseous in the morning and I want to know if I should eat differently."
Expected: green, practical advice, no escalation.

Yellow:
Phase: postpartum_week_2
User: "I cry almost every day and I feel overwhelmed, but I do not want to hurt myself or the baby."
Expected: yellow, emotional support, clinician follow-up suggestion, memory update.

Red:
Phase: pregnancy_month_8
User: "I have a terrible headache, my vision is blurry, and my hands and face are swollen."
Expected: red, urgent response, doctor summary, SLNG escalation.

Acceptance criteria:
- Existing chatbot still works.
- Text transcript path works before voice.
- MATERNAL ai prompt is injected into the existing agent flow.
- OpenAI returns structured triage JSON.
- Deterministic red-flag guardrails run after the LLM.
- Gradium adapters exist for STT and TTS.
- SLNG escalation adapter exists and is called for red cases.
- UI can show green, yellow, and red demo cases.
- No API keys are committed.
- The assistant never claims to diagnose or replace a clinician.
```

## Short Version For Teammate

If your teammate only needs the task summary, send this:

```text
Please keep your chatbot pipeline and add a MATERNAL ai layer on top.

I need:
1. Gradium STT so voice becomes the user transcript.
2. OpenAI structured JSON triage using the MATERNAL ai prompt.
3. Deterministic maternal red-flag guardrails after the LLM.
4. Gradium TTS so the assistant response can be spoken.
5. SLNG escalation adapter for red cases.
6. Pregnancy/postpartum phase context.
7. BLOOM phase-specific questions from BLOOM_FSM_QUESTIONS.md.
8. Simple long-term memory for mood, confidence, symptoms, and risk trend.

The product should behave like a maternal safety net, not a generic pregnancy chatbot or AI doctor.
```
