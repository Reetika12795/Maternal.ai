import { maternalSchema } from "./schema.js";
import { buildMaternalPrompt } from "./prompt.js";

export async function runMaternalTriage(input) {
  const { instructions, input: modelInput } = buildMaternalPrompt(input);
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      instructions,
      input: modelInput,
      text: {
        format: {
          type: "json_schema",
          name: "maternal_triage",
          strict: true,
          schema: maternalSchema
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = extractOutputText(data);
  if (!text) throw new Error("OpenAI returned no output text");
  return normalizeResult(JSON.parse(text), input.phase);
}

export function fallbackTriage({ transcript, phase, bloom }) {
  const lower = transcript.toLowerCase();
  const safetyDenial = /(do not|don't|dont|no thoughts of|not going to|would never).{0,30}(hurt myself|harm myself|hurt the baby|harm the baby)/;
  const harmIntentPattern = /(kill myself|want to die|suicide|end my life|hurt myself|harm myself|hurt the baby|harm the baby)/;
  const physicalRedPattern = /(chest pain|can't breathe|cannot breathe|heavy bleeding|soaking pads|faint|fainted|vision|blurry|severe headache|terrible headache|face.*swollen|hands.*swollen|baby.*not moving|movement.*stopped)/;
  const yellowPattern = /(cry|overwhelmed|hopeless|anxious|panic|disconnected|not connected|sad|numb|worse|pain|bleeding|vomit|nausea|fever|swelling)/;
  const hasHarmIntent = harmIntentPattern.test(lower) && !safetyDenial.test(lower);
  const triageCandidate = hasHarmIntent || physicalRedPattern.test(lower) ? "red" : yellowPattern.test(lower) ? "yellow" : "green";

  return normalizeResult({
    phase,
    summary: `User check-in during ${bloom.title}: ${transcript}`,
    detectedSymptoms: extractSymptoms(lower),
    emotionalSignals: extractEmotionalSignals(lower),
    triageCandidate,
    assistantText: fallbackAssistantText(triageCandidate, bloom),
    followUpQuestions: bloom.followUpQuestions.slice(0, triageCandidate === "red" ? 1 : 2),
    doctorSummary: {
      needed: triageCandidate === "red",
      urgency: triageCandidate === "red" ? "urgent" : triageCandidate === "yellow" ? "routine" : "none",
      reason: triageCandidate === "red" ? "Possible maternal red flag detected." : "No urgent escalation in demo fallback.",
      clinicalSummary: `Phase: ${phase}. Transcript: ${transcript}. Triage candidate: ${triageCandidate}.`
    },
    memoryUpdate: {
      moodTrend: /(cry|hopeless|sad|anxious|panic|disconnected|overwhelmed)/.test(lower) ? "worsening" : "unknown",
      confidenceTrend: /(failing|can't|cannot|scared|overwhelmed)/.test(lower) ? "worsening" : "unknown",
      newRiskSignals: triageCandidate !== "green" ? [triageCandidate] : [],
      notes: `Demo fallback classified this as ${triageCandidate}.`
    }
  }, phase);
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) chunks.push(content.text);
      if (content.type === "text" && content.text) chunks.push(content.text);
    }
  }
  return chunks.join("");
}

function normalizeResult(result, phase) {
  return {
    phase: result.phase || phase,
    summary: result.summary || "",
    detectedSymptoms: Array.isArray(result.detectedSymptoms) ? result.detectedSymptoms : [],
    emotionalSignals: Array.isArray(result.emotionalSignals) ? result.emotionalSignals : [],
    triageCandidate: ["green", "yellow", "red"].includes(result.triageCandidate) ? result.triageCandidate : "yellow",
    assistantText: result.assistantText || "I need a little more information to support this safely.",
    followUpQuestions: Array.isArray(result.followUpQuestions) ? result.followUpQuestions.slice(0, 3) : [],
    doctorSummary: {
      needed: Boolean(result.doctorSummary?.needed),
      urgency: result.doctorSummary?.urgency || "none",
      reason: result.doctorSummary?.reason || "",
      clinicalSummary: result.doctorSummary?.clinicalSummary || ""
    },
    memoryUpdate: {
      moodTrend: result.memoryUpdate?.moodTrend || "unknown",
      confidenceTrend: result.memoryUpdate?.confidenceTrend || "unknown",
      newRiskSignals: Array.isArray(result.memoryUpdate?.newRiskSignals) ? result.memoryUpdate.newRiskSignals : [],
      notes: result.memoryUpdate?.notes || ""
    }
  };
}

function fallbackAssistantText(triage, bloom) {
  if (triage === "red") {
    return "This may be urgent. Please contact your maternity team, urgent care, or emergency services now if symptoms are severe or you feel unsafe. I am preparing a clinician-facing summary.";
  }
  if (triage === "yellow") {
    return `I want to monitor this carefully. ${bloom.primaryCheck} If symptoms worsen or you feel something is not right, contact your clinician.`;
  }
  return `This sounds like a routine check-in. ${bloom.primaryCheck}`;
}

function extractSymptoms(lower) {
  const symptoms = [];
  for (const term of ["headache", "swelling", "bleeding", "pain", "fever", "nausea", "vomit", "dizzy", "faint", "vision", "shortness of breath", "chest pain"]) {
    if (lower.includes(term)) symptoms.push(term);
  }
  return symptoms;
}

function extractEmotionalSignals(lower) {
  const signals = [];
  for (const term of ["cry", "overwhelmed", "hopeless", "anxious", "panic", "disconnected", "sad", "numb", "failing", "unsafe"]) {
    if (lower.includes(term)) signals.push(term);
  }
  return signals;
}
