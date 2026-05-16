"""End-to-end check-in pipeline.

  user transcript (or audio file via Gradium STT)
    -> FSM resolves active state
    -> OpenAI structured response
    -> deterministic guardrails (red flag override)
    -> escalation hook if red
    -> Gradium TTS (optional)

The pipeline is intentionally synchronous. It is a hackathon demo, not
a production load path. Realtime streaming can be added by replacing
the OpenAI call with the Responses streaming API and the Gradium TTS
call with the WebSocket endpoint.
"""

from __future__ import annotations

import datetime as dt
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .fsm import Protocol, deterministic_triage
from .llm import call_llm
from . import voice as voice_io


@dataclass
class CheckinResult:
    transcript: str
    state_id: str
    state_label: str
    phase: str
    triage_final: str
    triage_llm: str
    triage_deterministic: Optional[str]
    overridden: bool
    assistant_text: str
    follow_up_questions: list[str]
    doctor_summary: dict
    memory_update: dict
    raw_llm: dict
    audio_path: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "transcript": self.transcript,
            "state_id": self.state_id,
            "state_label": self.state_label,
            "phase": self.phase,
            "triage": {
                "final": self.triage_final,
                "llm": self.triage_llm,
                "deterministic": self.triage_deterministic,
                "overridden": self.overridden,
            },
            "assistantText": self.assistant_text,
            "followUpQuestions": self.follow_up_questions,
            "doctorSummary": self.doctor_summary,
            "memoryUpdate": self.memory_update,
            "audioPath": self.audio_path,
        }


def resolve_triage(llm_verdict: str, deterministic: Optional[str]) -> tuple[str, bool]:
    """Apply the override rule.

    Deterministic red always wins. Deterministic yellow upgrades a
    green LLM verdict but does not downgrade a red one. The LLM can
    never downgrade a deterministic signal.
    """
    if deterministic == "red":
        return "red", llm_verdict != "red"
    if deterministic == "yellow":
        if llm_verdict == "green":
            return "yellow", True
        return llm_verdict, False
    return llm_verdict, False


def route_escalation(payload: dict, log_dir: str | Path = "./escalations") -> Path:
    """Local escalation stub. Writes payload JSON to a timestamped file.

    In production this is replaced by an SLNG agent dispatch or a
    webhook POST to a clinician routing service.
    """
    log_dir = Path(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    ts = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S")
    out = log_dir / f"escalation_{ts}.json"
    out.write_text(json.dumps(payload, indent=2))
    return out


def checkin(
    protocol: Protocol,
    state_id: str,
    transcript: str,
    memory_context: str = "No prior check-ins.",
    speak: bool = False,
    audio_out: Optional[str | Path] = None,
) -> CheckinResult:
    state = protocol.state(state_id)
    llm_raw = call_llm(state, transcript, memory_context, protocol=protocol)
    llm_verdict = llm_raw.get("triageCandidate", "green")
    deterministic = deterministic_triage(transcript, protocol)
    final, overridden = resolve_triage(llm_verdict, deterministic)

    result = CheckinResult(
        transcript=transcript,
        state_id=state.id,
        state_label=state.label,
        phase=state.phase,
        triage_final=final,
        triage_llm=llm_verdict,
        triage_deterministic=deterministic,
        overridden=overridden,
        assistant_text=llm_raw.get("assistantText", ""),
        follow_up_questions=llm_raw.get("followUpQuestions", []),
        doctor_summary=llm_raw.get("doctorSummary", {}),
        memory_update=llm_raw.get("memoryUpdate", {}),
        raw_llm=llm_raw,
    )

    if final == "red":
        route_escalation({
            "patientId": "demo-user",
            "state_id": state.id,
            "phase": state.phase,
            "triage": final,
            "urgency": result.doctor_summary.get("urgency", "urgent"),
            "reason": result.doctor_summary.get("reason", ""),
            "transcript": transcript,
            "detectedSymptoms": llm_raw.get("detectedSymptoms", []),
            "emotionalSignals": llm_raw.get("emotionalSignals", []),
            "doctorSummary": result.doctor_summary.get("clinicalSummary", ""),
            "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
        })

    if speak and audio_out and result.assistant_text:
        try:
            voice_io.tts(result.assistant_text, audio_out)
            result.audio_path = str(audio_out)
        except Exception as exc:  # noqa: BLE001
            result.audio_path = f"tts_error: {exc}"

    return result
