import http from "node:http";
import { readFile, mkdir, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLocalEnv } from "./src/env.js";
import { getBloomContext, phases } from "./src/bloom.js";
import { fallbackTriage, runMaternalTriage } from "./src/openai.js";
import { applyMaternalGuardrails } from "./src/triageRules.js";
import { transcribeWithGradium, speakWithGradium } from "./src/gradium.js";
import { routeMaternalEscalation } from "./src/slng.js";
import { recordPioneerEvent } from "./src/pioneer.js";
import { buildVisualPrompt, requestFalVisual } from "./src/fal.js";
import { loadMemory, updateMemory } from "./src/memory.js";

await loadLocalEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

await mkdir(dataDir, { recursive: true });
await mkdir(path.join(publicDir, "generated"), { recursive: true });

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        mode: process.env.OPENAI_API_KEY ? "live-openai" : "demo-fallback",
        integrations: {
          openai: Boolean(process.env.OPENAI_API_KEY),
          gradium: Boolean(process.env.GRADIUM_API_KEY),
          gradiumSttUrl: Boolean(process.env.GRADIUM_STT_URL),
          gradiumTtsUrl: Boolean(process.env.GRADIUM_TTS_URL),
          slng: Boolean(process.env.SLNG_API_KEY),
          pioneer: Boolean(process.env.PIONEER_API_KEY),
          fal: Boolean(process.env.FAL_KEY)
        },
        phases
      });
    }

    if (req.method === "POST" && url.pathname === "/api/checkin") {
      const body = await readJson(req);
      const result = await handleCheckin(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/api/transcribe") {
      const body = await readJson(req);
      const result = await transcribeWithGradium(body);
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/api/speak") {
      const body = await readJson(req);
      const result = await speakWithGradium(body.text || "");
      return sendJson(res, 200, result);
    }

    if (req.method === "POST" && url.pathname === "/api/visual") {
      const body = await readJson(req);
      const prompt = buildVisualPrompt(body.phase, body.summary || "");
      const visual = await requestFalVisual(prompt);
      return sendJson(res, 200, { prompt, visual });
    }

    if (req.method === "GET") {
      return serveStatic(url.pathname, res);
    }

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Internal server error",
      details: error.message
    });
  }
});

server.listen(port, host, () => {
  console.log(`MATERNAL ai prototype running at http://${host}:${port}`);
  console.log(process.env.OPENAI_API_KEY ? "OpenAI live mode enabled" : "Demo fallback mode enabled");
});

async function handleCheckin(body) {
  const patientId = body.patientId || "demo-mother";
  const phase = phases.includes(body.phase) ? body.phase : "positive_test";
  const transcript = String(body.transcript || "").trim();

  if (!transcript) {
    return {
      error: "Transcript is required",
      phases
    };
  }

  const bloom = getBloomContext(phase);
  const memory = await loadMemory(patientId);
  const patient = {
    id: patientId,
    language: body.language || "en",
    knownRisks: body.knownRisks || [],
    careTeam: body.careTeam || "demo clinic"
  };

  const llmResult = process.env.OPENAI_API_KEY
    ? await runMaternalTriage({ transcript, phase, bloom, memory, patient })
    : fallbackTriage({ transcript, phase, bloom, memory, patient });

  const finalResult = applyMaternalGuardrails({
    llmResult,
    transcript,
    phase,
    bloom,
    memory
  });

  await updateMemory(patientId, {
    phase,
    transcript,
    finalTriage: finalResult.triage,
    memoryUpdate: finalResult.memoryUpdate,
    symptoms: finalResult.detectedSymptoms,
    emotionalSignals: finalResult.emotionalSignals,
    timestamp: new Date().toISOString()
  });

  let escalation = null;
  if (finalResult.triage === "red" || finalResult.doctorSummary?.needed) {
    escalation = await routeMaternalEscalation({
      patientId,
      phase,
      transcript,
      triage: finalResult.triage,
      urgency: finalResult.doctorSummary?.urgency || "urgent",
      reason: finalResult.doctorSummary?.reason || "Maternal risk escalation",
      detectedSymptoms: finalResult.detectedSymptoms,
      emotionalSignals: finalResult.emotionalSignals,
      doctorSummary: finalResult.doctorSummary?.clinicalSummary || finalResult.summary,
      timestamp: new Date().toISOString()
    });
  }

  await recordPioneerEvent({
    patientId,
    phase,
    transcript,
    triage: finalResult.triage,
    guardrailOverrides: finalResult.guardrailOverrides,
    timestamp: new Date().toISOString()
  });

  const visualPrompt = buildVisualPrompt(phase, finalResult.summary);

  await appendFile(
    path.join(dataDir, "checkins.jsonl"),
    `${JSON.stringify({ patientId, phase, transcript, result: finalResult, timestamp: new Date().toISOString() })}\n`
  );

  return {
    patientId,
    transcript,
    phase,
    bloom,
    result: finalResult,
    escalation,
    visualPrompt,
    providerMode: process.env.OPENAI_API_KEY ? "openai" : "demo-fallback"
  };
}

async function serveStatic(pathname, res) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    return sendJson(res, 404, { error: "Not found" });
  }

  const ext = path.extname(filePath);
  const content = await readFile(filePath);
  res.writeHead(200, { "content-type": contentTypes[ext] || "application/octet-stream" });
  res.end(content);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}
