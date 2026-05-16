"""Gradium STT and TTS adapters.

Gradium provides realtime, low-latency voice models. For the hackathon
demo we use the REST endpoints. Streaming over WebSocket is available
at wss://eu.api.gradium.ai/api/speech/tts and can be wired later.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import httpx

GRADIUM_BASE = "https://eu.api.gradium.ai/api/speech"
DEFAULT_VOICE = "default"
DEFAULT_LANGUAGE = "en"
DEFAULT_MODEL = "default"


def _api_key() -> str:
    key = os.environ.get("GRADIUM_API_KEY")
    if not key:
        raise RuntimeError("GRADIUM_API_KEY not set")
    return key


def stt(audio_path: str | Path, language: str = DEFAULT_LANGUAGE) -> str:
    """Send an audio file to Gradium STT and return the transcript."""
    audio_path = Path(audio_path)
    with audio_path.open("rb") as fh:
        files = {"audio": (audio_path.name, fh, "audio/wav")}
        headers = {"Authorization": f"Bearer {_api_key()}"}
        data = {"language": language}
        resp = httpx.post(
            f"{GRADIUM_BASE}/stt",
            files=files,
            data=data,
            headers=headers,
            timeout=30.0,
        )
    resp.raise_for_status()
    payload = resp.json()
    return payload.get("transcript") or payload.get("text") or ""


def tts(
    text: str,
    out_path: str | Path,
    voice: str = DEFAULT_VOICE,
    language: str = DEFAULT_LANGUAGE,
    model: str = DEFAULT_MODEL,
) -> Path:
    """Synthesise speech via Gradium and write WAV to out_path."""
    out_path = Path(out_path)
    headers = {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
    }
    body = {
        "text": text,
        "voice": voice,
        "language": language,
        "model": model,
    }
    with httpx.stream(
        "POST",
        f"{GRADIUM_BASE}/tts",
        headers=headers,
        json=body,
        timeout=60.0,
    ) as resp:
        resp.raise_for_status()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("wb") as fh:
            for chunk in resp.iter_bytes():
                if chunk:
                    fh.write(chunk)
    return out_path
