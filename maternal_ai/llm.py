"""OpenAI Responses API wrapper with strict structured output.

The LLM is bound to a single JSON schema. It can never invent a state
transition. It can propose a triage candidate; the FSM may override it.
"""

from __future__ import annotations

import json
import os
from typing import Optional

from openai import OpenAI

from .fsm import Protocol, State

RESPONSE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "phase",
        "summary",
        "detectedSymptoms",
        "emotionalSignals",
        "triageCandidate",
        "assistantText",
        "followUpQuestions",
        "doctorSummary",
        "memoryUpdate",
    ],
    "properties": {
        "phase": {"type": "string"},
        "summary": {"type": "string"},
        "detectedSymptoms": {"type": "array", "items": {"type": "string"}},
        "emotionalSignals": {"type": "array", "items": {"type": "string"}},
        "triageCandidate": {"type": "string", "enum": ["green", "yellow", "red"]},
        "assistantText": {"type": "string"},
        "followUpQuestions": {"type": "array", "items": {"type": "string"}},
        "doctorSummary": {
            "type": "object",
            "additionalProperties": False,
            "required": ["needed", "urgency", "reason", "clinicalSummary"],
            "properties": {
                "needed": {"type": "boolean"},
                "urgency": {
                    "type": "string",
                    "enum": ["none", "routine", "same_day", "urgent", "emergency"],
                },
                "reason": {"type": "string"},
                "clinicalSummary": {"type": "string"},
            },
        },
        "memoryUpdate": {
            "type": "object",
            "additionalProperties": False,
            "required": ["moodTrend", "confidenceTrend", "newRiskSignals", "notes"],
            "properties": {
                "moodTrend": {
                    "type": "string",
                    "enum": ["unknown", "stable", "improving", "worsening"],
                },
                "confidenceTrend": {
                    "type": "string",
                    "enum": ["unknown", "stable", "improving", "worsening"],
                },
                "newRiskSignals": {"type": "array", "items": {"type": "string"}},
                "notes": {"type": "string"},
            },
        },
    },
}


SYSTEM_PROMPT = """You are Maternal IA, a protocol-bound maternal follow-up assistant.

Your role is to support pregnant and postpartum users by asking
structured follow-up questions, identifying possible safety signals,
explaining practical next steps, and preparing escalation summaries for
clinicians.

You are not a doctor. You do not diagnose. You do not replace emergency
services, a midwife, or a clinician.

Operate strictly inside the user's current maternal state.

Current state: {state_label} ({state_id}, phase: {state_phase})

Goals for this state:
{goals}

Routine questions to consider this turn:
{routine_questions}

Known red flags for this state (consider as red if any are present):
{red_flags}

Known yellow flags for this state (consider as at least yellow):
{yellow_flags}

Recent memory:
{memory_context}

User transcript:
{user_transcript}

Priorities, in order:
1. Detect emergency or urgent red flags.
2. Detect postpartum mental health risk, especially self-harm,
   baby-harm, hopelessness, psychosis-like language, or inability to
   care for self or baby.
3. Ask concise follow-up questions only when needed for triage.
4. Give practical, calm guidance when green or yellow.
5. Generate a clear doctor summary when escalation is needed.

Rules:
- Never claim to diagnose.
- Never invent medical protocol content.
- Use simple, compassionate language.
- Ask at most 2 follow-up questions unless red.
- Return only valid JSON matching the required schema.

Triage definitions:
- green: expected or low-risk, routine education, no escalation needed.
- yellow: monitor, persistent, worsening, or non-urgent clinician contact.
- red: urgent or emergency concern, immediate escalation recommended.
"""


def build_messages(
    state: State,
    user_transcript: str,
    memory_context: str = "No prior check-ins.",
) -> list[dict]:
    prompt = SYSTEM_PROMPT.format(
        state_label=state.label,
        state_id=state.id,
        state_phase=state.phase,
        goals="\n".join(f"- {g}" for g in state.goals) or "- (none)",
        routine_questions="\n".join(f"- {q}" for q in state.routine_questions) or "- (none)",
        red_flags="\n".join(f"- {r}" for r in state.red_flags) or "- (none)",
        yellow_flags="\n".join(f"- {y}" for y in state.yellow_flags) or "- (none)",
        memory_context=memory_context,
        user_transcript=user_transcript,
    )
    return [
        {"role": "system", "content": prompt},
        {"role": "user", "content": user_transcript},
    ]


def call_llm(
    state: State,
    user_transcript: str,
    memory_context: str = "No prior check-ins.",
    protocol: Optional[Protocol] = None,
    client: Optional[OpenAI] = None,
) -> dict:
    """Call OpenAI with structured output. Returns parsed dict."""
    client = client or OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    model = (protocol.llm.get("model") if protocol else None) or "gpt-4o-mini"
    temperature = (protocol.llm.get("temperature") if protocol else None) or 0.2
    max_tokens = (protocol.llm.get("max_tokens") if protocol else None) or 280

    messages = build_messages(state, user_transcript, memory_context)
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "maternal_ia_response",
                "strict": True,
                "schema": RESPONSE_SCHEMA,
            },
        },
    )
    return json.loads(resp.choices[0].message.content)
