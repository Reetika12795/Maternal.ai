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
  green: {
    phase: "pregnancy_month_2",
    transcript: "I feel nauseous in the morning and I want to know if I should eat differently."
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
  voiceStatus: document.querySelector("#voiceStatus"),
  phase: document.querySelector("#phase"),
  timeline: document.querySelector("#timeline"),
  transcript: document.querySelector("#transcript"),
  form: document.querySelector("#checkinForm"),
  listenBtn: document.querySelector("#listenBtn"),
  greenDemo: document.querySelector("#greenDemo"),
  yellowDemo: document.querySelector("#yellowDemo"),
  redDemo: document.querySelector("#redDemo"),
  phaseTitle: document.querySelector("#phaseTitle"),
  triageBadge: document.querySelector("#triageBadge"),
  assistantText: document.querySelector("#assistantText"),
  questions: document.querySelector("#questions"),
  memoryUpdate: document.querySelector("#memoryUpdate"),
  doctorSummary: document.querySelector("#doctorSummary"),
  visualPrompt: document.querySelector("#visualPrompt"),
  speakBtn: document.querySelector("#speakBtn")
};

let lastAssistantText = "";
let recognition = null;
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
  els.phase.value = "pregnancy_month_8";
  renderTimeline(4);

  els.phase.addEventListener("change", () => {
    const phase = els.phase.value;
    fetchJson("/api/checkin", {
      method: "POST",
      body: JSON.stringify({ phase, transcript: "Quick phase context check." })
    }).catch(() => null);
  });
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await runCheckin();
});

els.greenDemo.addEventListener("click", () => setDemo("green"));
els.yellowDemo.addEventListener("click", () => setDemo("yellow"));
els.redDemo.addEventListener("click", () => setDemo("red"));
els.speakBtn.addEventListener("click", speakAssistant);
els.listenBtn.addEventListener("click", startBrowserVoice);
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && event.target === document.body && !audioCapture) {
    event.preventDefault();
    startBrowserVoice();
  }
});

function setDemo(kind) {
  els.phase.value = demos[kind].phase;
  els.transcript.value = demos[kind].transcript;
}

async function runCheckin() {
  setLoading(true);
  try {
    const payload = {
      phase: els.phase.value,
      transcript: els.transcript.value,
      patientId: "demo-mother"
    };
    const data = await fetchJson("/api/checkin", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    renderResult(data);
  } catch (error) {
    els.assistantText.textContent = error.message;
  } finally {
    setLoading(false);
  }
}

function renderResult(data) {
  const result = data.result;
  lastAssistantText = result.assistantText;
  els.phaseTitle.textContent = data.bloom.title;
  els.triageBadge.textContent = result.triage;
  els.triageBadge.className = `badge ${result.triage}`;
  els.assistantText.textContent = result.assistantText;
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
  els.visualPrompt.textContent = data.visualPrompt;
  renderTimeline(data.bloom.order);
}

function renderTimeline(activeOrder) {
  els.timeline.innerHTML = "";
  bloomTitles.forEach((title, index) => {
    const dot = document.createElement("div");
    dot.className = `dot ${index + 1 === activeOrder ? "active" : ""}`;
    dot.title = title;
    dot.innerHTML = `<strong>${index + 1}</strong>${title}`;
    els.timeline.appendChild(dot);
  });
}

async function startBrowserVoice() {
  if (navigator.mediaDevices?.getUserMedia && window.AudioContext) {
    await recordPcmForGradium();
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Browser speech recognition is not available here. Use typed transcript or Gradium STT route.");
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  els.voiceStatus.textContent = "Listening with browser speech...";
  recognition.onresult = (event) => {
    els.transcript.value = event.results[0][0].transcript;
    els.voiceStatus.textContent = "Transcript captured";
  };
  recognition.onerror = (event) => {
    els.voiceStatus.textContent = "Voice capture failed";
    alert(`Voice capture failed: ${event.error}`);
  };
  recognition.onend = () => {
    if (els.voiceStatus.textContent.includes("Listening")) els.voiceStatus.textContent = "Voice standby";
  };
  recognition.start();
}

async function recordPcmForGradium() {
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

    audioCapture = {
      context,
      source,
      processor,
      stream,
      chunks,
      sampleRate: context.sampleRate
    };

    els.listenBtn.classList.add("recording");
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
  els.voiceStatus.textContent = "Transcribing voice with Gradium...";

  const pcm = encodePcm16(resampleTo24k(flattenFloat32(capture.chunks), capture.sampleRate));
  const audioBase64 = arrayBufferToBase64(pcm.buffer);
  const stt = await fetchJson("/api/transcribe", {
    method: "POST",
    body: JSON.stringify({
      audioBase64,
      mimeType: "audio/pcm",
      inputFormat: "pcm"
    })
  });

  if (stt.transcript) {
    els.transcript.value = stt.transcript;
    els.voiceStatus.textContent = `Transcript captured via ${stt.provider}`;
  } else {
    els.voiceStatus.textContent = stt.error || "Gradium returned no transcript; use typed input";
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
    return;
  }

  if (tts.audioBase64) {
    new Audio(`data:${tts.mimeType || "audio/mpeg"};base64,${tts.audioBase64}`).play();
    return;
  }

  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(lastAssistantText);
    utterance.rate = 0.94;
    utterance.pitch = 0.98;
    window.speechSynthesis.speak(utterance);
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
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
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

function setLoading(isLoading) {
  const button = els.form.querySelector(".primary");
  button.disabled = isLoading;
  button.textContent = isLoading ? "Running check-in..." : "Run MATERNAL check-in";
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
