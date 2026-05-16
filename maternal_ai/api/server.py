"""FastAPI service exposing /checkin (text) and /voice (audio in+out).

The /voice endpoint is the demo path: browser sends a webm/opus blob
from MediaRecorder, the server converts to WAV with ffmpeg, calls
Gradium STT, runs the FSM + LLM, calls Gradium TTS, and returns the
JSON triage result with a base64-encoded WAV reply embedded so the
browser can play it back without a second round-trip.
"""

from __future__ import annotations

import asyncio
import base64
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from maternal_ai.fsm import Protocol
from maternal_ai.pipeline import checkin
from maternal_ai import voice as voice_io

PROTOCOL_PATH = Path(__file__).resolve().parents[1] / "protocol" / "maternal_protocol.yaml"
STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
AUDIO_DIR = Path("./generated_audio").resolve()
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

protocol = Protocol.load(PROTOCOL_PATH)

app = FastAPI(title="Maternal IA", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CheckinRequest(BaseModel):
    state_id: str
    transcript: str
    memory_context: Optional[str] = "No prior check-ins."
    speak: bool = False


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "protocol": protocol.name, "states": len(protocol.states)}


@app.get("/states")
def list_states() -> dict:
    return {
        "states": [
            {"id": s.id, "label": s.label, "phase": s.phase, "next": s.next_state}
            for s in protocol.states.values()
        ]
    }


async def _maybe_embed_tts(result_dict: dict) -> dict:
    """Synthesise the assistant text with Gradium and base64-embed it."""
    text = result_dict.get("assistantText", "")
    if not text:
        return result_dict
    try:
        wav_bytes = await voice_io.tts_async(text)
        result_dict["assistantAudio"] = {
            "mime": "audio/wav",
            "base64": base64.b64encode(wav_bytes).decode("ascii"),
        }
    except Exception as exc:  # noqa: BLE001
        result_dict["assistantAudio"] = {"error": str(exc)}
    return result_dict


@app.post("/checkin")
async def checkin_text(req: CheckinRequest) -> dict:
    if req.state_id not in protocol.states:
        raise HTTPException(404, f"unknown state: {req.state_id}")
    result = checkin(
        protocol=protocol,
        state_id=req.state_id,
        transcript=req.transcript,
        memory_context=req.memory_context or "No prior check-ins.",
    )
    out = result.to_dict()
    if req.speak:
        out = await _maybe_embed_tts(out)
    return out


@app.post("/voice")
async def voice_turn(
    state_id: str = Form(...),
    audio: UploadFile = File(...),
    memory_context: str = Form("No prior check-ins."),
) -> dict:
    """End-to-end voice turn: audio in, JSON + assistant audio out."""
    if state_id not in protocol.states:
        raise HTTPException(404, f"unknown state: {state_id}")
    raw = await audio.read()
    try:
        transcript = await voice_io.stt_async(raw, audio.content_type)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Gradium STT failed: {exc}")
    if not transcript.strip():
        raise HTTPException(400, "STT returned empty transcript")
    result = checkin(
        protocol=protocol,
        state_id=state_id,
        transcript=transcript,
        memory_context=memory_context,
    )
    return await _maybe_embed_tts(result.to_dict())


@app.get("/audio/{name}")
def audio(name: str) -> FileResponse:
    p = AUDIO_DIR / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="audio/wav")


if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
