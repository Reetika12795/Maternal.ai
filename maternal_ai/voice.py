"""Gradium STT and TTS clients using the official `gradium` SDK.

The browser uploads audio as webm/opus from MediaRecorder. We convert
to WAV via ffmpeg before handing the bytes to Gradium STT. TTS output
is returned as raw WAV bytes that the API layer can base64-encode and
embed in the JSON response.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import gradium
from gradium.speech import STTSetup

DEFAULT_VOICE_ID = os.environ.get("GRADIUM_VOICE_ID", "YTpq7expH9539ERJ")
DEFAULT_MODEL = "default"


def _api_key() -> str:
    key = os.environ.get("GRADIUM_API_KEY")
    if not key:
        raise RuntimeError("GRADIUM_API_KEY not set")
    return key


def _client() -> gradium.client.GradiumClient:
    return gradium.client.GradiumClient(api_key=_api_key())


def _ensure_wav(raw_bytes: bytes, content_type: str | None) -> bytes:
    """Return WAV bytes. If the input is already WAV, pass through.

    Otherwise shell out to ffmpeg to transcode. ffmpeg is required for
    browser recordings (webm/opus). The function is sync because the
    FastAPI endpoint already runs the call in a thread.
    """
    if raw_bytes[:4] == b"RIFF":
        return raw_bytes
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is required to convert non-WAV uploads")
    with tempfile.NamedTemporaryFile(suffix=".in", delete=False) as fin:
        fin.write(raw_bytes)
        fin_path = fin.name
    fout_path = fin_path + ".wav"
    try:
        proc = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                fin_path,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-f",
                "wav",
                fout_path,
            ],
            capture_output=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {proc.stderr.decode()[:300]}")
        return Path(fout_path).read_bytes()
    finally:
        for p in (fin_path, fout_path):
            try:
                os.unlink(p)
            except FileNotFoundError:
                pass


async def stt_async(audio_bytes: bytes, content_type: str | None = None) -> str:
    wav = _ensure_wav(audio_bytes, content_type)
    setup = STTSetup(model_name=DEFAULT_MODEL, input_format="wav")
    result = await _client().stt(setup, wav)
    return result.text or ""


async def tts_async(text: str, voice_id: str | None = None) -> bytes:
    setup = {
        "model_name": DEFAULT_MODEL,
        "voice_id": voice_id or DEFAULT_VOICE_ID,
        "output_format": "wav",
    }
    result = await _client().tts(setup=setup, text=text)
    return result.raw_data


def stt(audio_bytes: bytes, content_type: str | None = None) -> str:
    return asyncio.run(stt_async(audio_bytes, content_type))


def tts(text: str, out_path: str | Path, voice_id: str | None = None) -> Path:
    out_path = Path(out_path)
    data = asyncio.run(tts_async(text, voice_id))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(data)
    return out_path
