const phaseLabels = {
  positive_test: "Positive test",
  pregnancy_month_1: "Month 1",
  pregnancy_month_2: "Month 2",
  pregnancy_month_3: "Month 3",
  pregnancy_month_4: "Month 4",
  pregnancy_month_5: "Month 5",
  pregnancy_month_6: "Month 6",
  pregnancy_month_7: "Month 7",
  pregnancy_month_8: "Month 8",
  pregnancy_month_9: "Month 9",
  birth: "Birth",
  postpartum_week_1: "Postpartum week 1",
  postpartum_week_2: "Postpartum week 2",
  postpartum_week_6: "Postpartum week 6",
  postpartum_month_3: "Postpartum month 3",
  postpartum_month_6: "Postpartum month 6",
  recovery_complete: "Recovery complete"
};

const bloomTitles = [
  "Positive Test",
  "First Scan",
  "Baby Development",
  "Risk Detection",
  "Birth Prep",
  "Recovery",
  "Mood",
  "PPD",
  "Wellbeing"
];

const demos = {
  positive: {
    phase: "positive_test",
    transcript: "I just had a positive pregnancy test. I feel okay, but I am not sure what supplements I should take or when to book an appointment."
  },
  yellow: {
    phase: "postpartum_week_2",
    transcript: "I cry almost every day and I feel overwhelmed, but I do not want to hurt myself or the baby."
  },
  red: {
    phase: "pregnancy_month_8",
    transcript: "I have a terrible headache, my vision is blurry, and my hands and face are swollen."
  }
};

const els = {
  mode: document.querySelector("#mode"),
  integrations: document.querySelector("#integrations"),
  checkinCount: document.querySelector("#checkinCount"),
  highestRisk: document.querySelector("#highestRisk"),
  latestMood: document.querySelector("#latestMood"),
  memoryPhase: document.querySelector("#memoryPhase"),
  memoryConfidence: document.querySelector("#memoryConfidence"),
  memorySignals: document.querySelector("#memorySignals"),
  patientId: document.querySelector("#patientId"),
  phase: document.querySelector("#phase"),
  timeline: document.querySelector("#timeline"),
  transcript: document.querySelector("#transcript"),
  form: document.querySelector("#checkinForm"),
  listenBtn: document.querySelector("#listenBtn"),
  positiveDemo: document.querySelector("#positiveDemo"),
  yellowDemo: document.querySelector("#yellowDemo"),
  redDemo: document.querySelector("#redDemo"),
  resetHistory: document.querySelector("#resetHistory"),
  chatLog: document.querySelector("#chatLog"),
  voiceStatus: document.querySelector("#voiceStatus"),
  phaseTitle: document.querySelector("#phaseTitle"),
  triageBadge: document.querySelector("#triageBadge"),
  body: document.body,
  questions: document.querySelector("#questions"),
  memoryUpdate: document.querySelector("#memoryUpdate"),
  doctorSummary: document.querySelector("#doctorSummary"),
  speakBtn: document.querySelector("#speakBtn")
};

let lastAssistantText = "";
let audioCapture = null;

init();

async function init() {
  const health = await fetchJson("/api/health");
  els.mode.textContent = health.mode === "live-openai" ? "Live OpenAI mode" : "Demo fallback mode";
  els.integrations.textContent = Object.entries(health.integrations)
    .map(([key, value]) => `${key}: ${value ? "on" : "off"}`)
    .join(" / ");

  for (const phase of health.phases) {
    const option = document.createElement("option");
    option.value = phase;
    option.textContent = phaseLabels[phase] || phase;
    els.phase.appendChild(option);
  }

  els.phase.value = "postpartum_week_2";
  renderTimeline(7);
  await loadHistory();
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runCheckin();
});

els.positiveDemo.addEventListener("click", () => setDemo("positive"));
els.yellowDemo.addEventListener("click", () => setDemo("yellow"));
els.redDemo.addEventListener("click", () => setDemo("red"));
els.speakBtn.addEventListener("click", speakAssistant);
els.listenBtn.addEventListener("click", startVoice);
els.resetHistory.addEventListener("click", resetHistory);
els.patientId.addEventListener("change", loadHistory);

function setDemo(kind) {
  els.phase.value = demos[kind].phase;
  els.transcript.value = demos[kind].transcript;
}

async function runCheckin() {
  const transcript = els.transcript.value.trim();
  if (!transcript) return;

  addMessage("user", "Mother", transcript);
  setLoading(true);

  try {
    const data = await fetchJson("/api/checkin", {
      method: "POST",
      body: JSON.stringify({
        phase: els.phase.value,
        transcript,
        patientId: els.patientId.value || "demo-mother"
      })
    });
    renderResult(data);
    els.transcript.value = "";
  } catch (error) {
    addMessage("assistant", "System", error.message);
  } finally {
    setLoading(false);
  }
}

function renderResult(data) {
  const result = data.result;
  lastAssistantText = result.assistantText;

  addMessage("assistant", "MATERNAL ai", result.assistantText, result.triage);

  els.phaseTitle.textContent = data.bloom.title;
  els.triageBadge.textContent = result.triage;
  els.triageBadge.className = `badge ${result.triage}`;
  els.body.dataset.triage = result.triage;
  renderTimeline(data.bloom.order);

  els.questions.innerHTML = "";
  for (const question of result.followUpQuestions || []) {
    const li = document.createElement("li");
    li.textContent = question;
    els.questions.appendChild(li);
  }

  els.memoryUpdate.textContent = [
    `Mood: ${result.memoryUpdate.moodTrend}`,
    `Confidence: ${result.memoryUpdate.confidenceTrend}`,
    result.memoryUpdate.notes
  ].filter(Boolean).join("\n");

  els.doctorSummary.textContent = JSON.stringify({
    needed: result.doctorSummary.needed,
    urgency: result.doctorSummary.urgency,
    reason: result.doctorSummary.reason,
    clinicalSummary: result.doctorSummary.clinicalSummary,
    escalation: data.escalation
  }, null, 2);

  renderMemory(data.memory);
}

async function loadHistory() {
  const data = await fetchJson(`/api/history?patientId=${encodeURIComponent(els.patientId.value || "demo-mother")}`);
  renderMemory(data.memory);
  renderConversationFromMemory(data.memory);
}

async function resetHistory() {
  const data = await fetchJson("/api/history/reset", {
    method: "POST",
    body: JSON.stringify({ patientId: els.patientId.value || "demo-mother" })
  });
  renderMemory(data.memory);
  els.chatLog.innerHTML = "";
  addMessage("assistant", "MATERNAL ai", "Patient history reset. Start a new check-in when ready.");
  els.triageBadge.textContent = "idle";
  els.triageBadge.className = "badge neutral";
  els.body.dataset.triage = "idle";
  els.doctorSummary.textContent = "No escalation yet.";
  els.memoryUpdate.textContent = "No memory update yet.";
  els.questions.innerHTML = "";
}

function renderMemory(memory) {
  const profile = memory?.profile || {};
  const recent = memory?.recent || [];
  els.checkinCount.textContent = profile.totalCheckins || 0;
  els.highestRisk.textContent = profile.highestTriage || "-";
  els.latestMood.textContent = shortTrend(profile.moodTrend);
  els.memoryPhase.textContent = phaseLabels[profile.latestPhase] || profile.latestPhase || "-";
  els.memoryConfidence.textContent = profile.confidenceTrend || "unknown";
  els.memorySignals.textContent = (profile.repeatedSignals || []).slice(-4).join(", ") || "none";

  const last = recent[recent.length - 1];
  if (last?.phase) {
    els.phase.value = last.phase;
    renderTimelineFromPhase(last.phase);
  }
}

function renderConversationFromMemory(memory) {
  const recent = memory?.recent || [];
  els.chatLog.innerHTML = "";
  if (!recent.length) {
    addMessage("assistant", "MATERNAL ai", "I am ready for a pregnancy or postpartum check-in. Pick a scenario or type what the mother says.");
    return;
  }
  for (const entry of recent) {
    addMessage("user", "Mother", entry.transcript);
    if (entry.assistantText) {
      addMessage("assistant", "MATERNAL ai", entry.assistantText, entry.finalTriage);
    }
  }
}

function addMessage(type, speaker, text, triage = null) {
  const article = document.createElement("article");
  article.className = `message ${type}`;
  article.innerHTML = `
    <span>${speaker}${triage ? ` · ${triage.toUpperCase()}` : ""}</span>
    <p></p>
  `;
  article.querySelector("p").textContent = text;
  els.chatLog.appendChild(article);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

function renderTimeline(activeOrder) {
  els.timeline.innerHTML = "";
  bloomTitles.forEach((title, index) => {
    const dot = document.createElement("div");
    dot.className = `dot ${index + 1 === activeOrder ? "active" : ""}`;
    dot.title = title;
    dot.innerHTML = `<em>${phaseIcon(index + 1)}</em><strong>${index + 1}</strong>${title}`;
    els.timeline.appendChild(dot);
  });
}

function renderTimelineFromPhase(phase) {
  const order = {
    positive_test: 1,
    pregnancy_month_1: 1,
    pregnancy_month_2: 2,
    pregnancy_month_3: 2,
    pregnancy_month_4: 3,
    pregnancy_month_5: 3,
    pregnancy_month_6: 4,
    pregnancy_month_7: 4,
    pregnancy_month_8: 5,
    pregnancy_month_9: 5,
    birth: 6,
    postpartum_week_1: 6,
    postpartum_week_2: 7,
    postpartum_week_6: 8,
    postpartum_month_3: 8,
    postpartum_month_6: 9,
    recovery_complete: 9
  }[phase] || 1;
  renderTimeline(order);
}

async function startVoice() {
  if (audioCapture) {
    await stopPcmRecording();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const chunks = [];

    processor.onaudioprocess = (event) => {
      chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };

    source.connect(processor);
    processor.connect(context.destination);
    audioCapture = { context, source, processor, stream, chunks, sampleRate: context.sampleRate };
    els.listenBtn.classList.add("recording");
    els.body.dataset.voice = "recording";
    els.voiceStatus.textContent = "Recording... click again to stop";
  } catch (error) {
    els.voiceStatus.textContent = "Microphone unavailable";
    alert(`Microphone failed: ${error.message}`);
  }
}

async function stopPcmRecording() {
  const capture = audioCapture;
  audioCapture = null;

  capture.processor.disconnect();
  capture.source.disconnect();
  capture.stream.getTracks().forEach((track) => track.stop());
  await capture.context.close();

  els.listenBtn.classList.remove("recording");
  els.body.dataset.voice = "thinking";
  els.voiceStatus.textContent = "Transcribing with Gradium...";

  const pcm = encodePcm16(resampleTo24k(flattenFloat32(capture.chunks), capture.sampleRate));
  const stt = await fetchJson("/api/transcribe", {
    method: "POST",
    body: JSON.stringify({
      audioBase64: arrayBufferToBase64(pcm.buffer),
      mimeType: "audio/pcm",
      inputFormat: "pcm"
    })
  });

  if (stt.transcript) {
    els.transcript.value = stt.transcript;
    els.body.dataset.voice = "ready";
    els.voiceStatus.textContent = `Transcript captured via ${stt.provider}`;
  } else {
    els.body.dataset.voice = "ready";
    els.voiceStatus.textContent = stt.error || "No transcript captured";
  }
}

async function speakAssistant() {
  if (!lastAssistantText) return;
  const tts = await fetchJson("/api/speak", {
    method: "POST",
    body: JSON.stringify({ text: lastAssistantText })
  });

  if (tts.audioUrl) {
    new Audio(tts.audioUrl).play();
  } else if (tts.audioBase64) {
    new Audio(`data:${tts.mimeType || "audio/mpeg"};base64,${tts.audioBase64}`).play();
  } else if ("speechSynthesis" in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(lastAssistantText));
  }
}

function flattenFloat32(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function resampleTo24k(input, inputSampleRate) {
  const outputSampleRate = 24000;
  if (inputSampleRate === outputSampleRate) return input;
  const ratio = inputSampleRate / outputSampleRate;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i += 1) {
    const index = i * ratio;
    const left = Math.floor(index);
    const right = Math.min(left + 1, input.length - 1);
    const weight = index - left;
    output[i] = input[left] * (1 - weight) + input[right] * weight;
  }
  return output;
}

function encodePcm16(samples) {
  const output = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function shortTrend(value) {
  if (value === "worsening") return "down";
  if (value === "improving") return "up";
  return value || "?";
}

function phaseIcon(order) {
  return ["+", "◐", "◌", "!", "⇢", "✦", "♡", "∞", "✓"][order - 1] || "•";
}

function setLoading(isLoading) {
  const button = els.form.querySelector(".primary");
  button.disabled = isLoading;
  button.textContent = isLoading ? "Thinking..." : "Send check-in";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }
  return response.json();
}
