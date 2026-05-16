"""FastAPI service exposing /checkin and /tts endpoints.

Mirrors the contract proposed in BUILD_PLAN.md so the Next.js
front-end the team is building can talk to this backend without
adapter glue.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
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


@app.post("/checkin")
def checkin_text(req: CheckinRequest) -> dict:
    if req.state_id not in protocol.states:
        raise HTTPException(404, f"unknown state: {req.state_id}")
    audio_out = AUDIO_DIR / f"{req.state_id}.wav" if req.speak else None
    result = checkin(
        protocol=protocol,
        state_id=req.state_id,
        transcript=req.transcript,
        memory_context=req.memory_context or "No prior check-ins.",
        speak=req.speak,
        audio_out=audio_out,
    )
    return result.to_dict()


@app.post("/checkin_audio")
async def checkin_audio(
    state_id: str = Form(...),
    audio: UploadFile = File(...),
    memory_context: str = Form("No prior check-ins."),
    speak: bool = Form(False),
) -> dict:
    if state_id not in protocol.states:
        raise HTTPException(404, f"unknown state: {state_id}")
    tmp_in = AUDIO_DIR / f"in_{state_id}.wav"
    tmp_in.write_bytes(await audio.read())
    try:
        transcript = voice_io.stt(tmp_in)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"Gradium STT failed: {exc}")
    audio_out = AUDIO_DIR / f"out_{state_id}.wav" if speak else None
    result = checkin(
        protocol=protocol,
        state_id=state_id,
        transcript=transcript,
        memory_context=memory_context,
        speak=speak,
        audio_out=audio_out,
    )
    return result.to_dict()


@app.get("/audio/{name}")
def audio(name: str) -> FileResponse:
    p = AUDIO_DIR / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="audio/wav")


if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
