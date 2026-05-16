const DEFAULT_STT_URL = "https://api.gradium.ai/api/post/speech/asr";
const DEFAULT_TTS_URL = "https://api.gradium.ai/api/post/speech/tts";
const DEFAULT_VOICE_ID = "YTpq7expH9539ERJ";

export async function transcribeWithGradium({ audioBase64, mimeType, inputFormat, demoTranscript }) {
  const sttUrl = process.env.GRADIUM_STT_URL || DEFAULT_STT_URL;

  if (!process.env.GRADIUM_API_KEY || !audioBase64) {
    return {
      provider: "browser-or-demo",
      transcript: demoTranscript || "",
      note: "Gradium STT is not fully configured. Browser speech recognition or typed input is used for this prototype."
    };
  }

  if (sttUrl.startsWith("wss://") || sttUrl.startsWith("ws://")) {
    return transcribeWithGradiumWebSocket({
      sttUrl,
      audioBase64,
      inputFormat: inputFormat || inputFormatFromMimeType(mimeType)
    });
  }

  const url = new URL(sttUrl);
  url.searchParams.set("input_format", inputFormat || inputFormatFromMimeType(mimeType));
  url.searchParams.set("json_config", JSON.stringify({ language: "en" }));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": contentTypeForInput(inputFormat || inputFormatFromMimeType(mimeType)),
      "x-api-key": process.env.GRADIUM_API_KEY
    },
    body: Buffer.from(audioBase64, "base64")
  });

  if (!response.ok) {
    return {
      provider: "gradium",
      transcript: "",
      error: `Gradium STT failed with ${response.status}`,
      note: await response.text()
    };
  }

  const body = await response.text();
  const textSegments = body
    .split(/\r?\n/)
    .map((line) => safeJson(line))
    .filter((message) => message?.type === "text" && message.text)
    .map((message) => message.text);

  return {
    provider: "gradium",
    transcript: textSegments.join(" ").trim()
  };
}

export async function speakWithGradium(text) {
  const ttsUrl = process.env.GRADIUM_TTS_URL || DEFAULT_TTS_URL;

  if (!process.env.GRADIUM_API_KEY || !text) {
    return {
      provider: "browser-or-demo",
      audioUrl: null,
      note: "Gradium TTS is not fully configured. Browser speech synthesis is used for this prototype."
    };
  }

  const response = await fetch(ttsUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.GRADIUM_API_KEY}`,
      "x-api-key": process.env.GRADIUM_API_KEY
    },
    body: JSON.stringify({
      text,
      voice_id: process.env.GRADIUM_VOICE_ID || DEFAULT_VOICE_ID,
      output_format: "wav",
      only_audio: true
    })
  });

  if (!response.ok) {
    return {
      provider: "gradium",
      audioUrl: null,
      error: `Gradium TTS failed with ${response.status}`,
      note: "Check GRADIUM_TTS_URL payload shape for the hackathon API."
    };
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("audio/") || contentType.includes("octet-stream")) {
    const audioBase64 = Buffer.from(await response.arrayBuffer()).toString("base64");
    return {
      provider: "gradium",
      audioUrl: null,
      audioBase64,
      mimeType: contentType || "audio/wav"
    };
  }

  const data = await response.json();
  return {
    provider: "gradium",
    audioUrl: data.audioUrl || data.url || data.result?.audioUrl || data.data?.audioUrl || null,
    audioBase64: data.audioBase64 || data.audio || data.result?.audio || data.data?.audio || null,
    mimeType: data.mimeType || data.contentType || "audio/mpeg"
  };
}

async function transcribeWithGradiumWebSocket({ sttUrl, audioBase64, inputFormat }) {
  const messages = [];

  return new Promise((resolve) => {
    const ws = new WebSocket(sttUrl, {
      headers: {
        "x-api-key": process.env.GRADIUM_API_KEY
      }
    });

    const timeout = setTimeout(() => {
      tryClose(ws);
      resolve({
        provider: "gradium",
        transcript: messages.join(" ").trim(),
        error: messages.length ? null : "Gradium STT timed out before returning text."
      });
    }, 20000);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({
        type: "setup",
        model_name: "default",
        input_format: inputFormat
      }));
    });

    ws.addEventListener("message", (event) => {
      const message = safeJson(String(event.data));
      if (!message) return;

      if (message.type === "ready") {
        ws.send(JSON.stringify({
          type: "audio",
          audio: audioBase64
        }));
        ws.send(JSON.stringify({ type: "end_of_stream" }));
      }

      if (message.type === "text" && message.text) {
        messages.push(message.text);
      }

      if (message.type === "error") {
        clearTimeout(timeout);
        tryClose(ws);
        resolve({
          provider: "gradium",
          transcript: messages.join(" ").trim(),
          error: message.message || "Gradium STT error"
        });
      }

      if (message.type === "end_of_stream") {
        clearTimeout(timeout);
        tryClose(ws);
        resolve({
          provider: "gradium",
          transcript: messages.join(" ").trim()
        });
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(timeout);
      resolve({
        provider: "gradium",
        transcript: "",
        error: "Gradium STT WebSocket connection failed."
      });
    });
  });
}

function inputFormatFromMimeType(mimeType = "") {
  if (mimeType.includes("pcm")) return "pcm";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg") || mimeType.includes("opus")) return "opus";
  return "pcm";
}

function contentTypeForInput(inputFormat) {
  if (inputFormat === "pcm") return "audio/pcm";
  if (inputFormat === "opus") return "audio/ogg";
  return "audio/wav";
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function tryClose(ws) {
  try {
    ws.close();
  } catch {
    // Ignore close failures.
  }
}
