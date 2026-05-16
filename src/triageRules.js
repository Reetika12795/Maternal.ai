const redRules = [
  { name: "self_harm", pattern: /\b(kill myself|hurt myself|harm myself|want to die|suicide|end my life)\b/i },
  { name: "baby_harm", pattern: /\b(hurt the baby|harm the baby|kill the baby|afraid i will hurt)\b/i },
  { name: "unsafe", pattern: /\b(i feel unsafe|not safe|unsafe at home|cannot care for myself|can't care for myself|cannot care for the baby|can't care for the baby)\b/i },
  { name: "chest_breathing", pattern: /\b(chest pain|can't breathe|cannot breathe|shortness of breath|trouble breathing)\b/i },
  { name: "heavy_bleeding", pattern: /\b(heavy bleeding|soaking.*pad|large clots|gushing blood)\b/i },
  { name: "fainting", pattern: /\b(fainted|fainting|passed out|passing out)\b/i },
  { name: "pregnancy_preeclampsia_cluster", pattern: /\b(severe headache|terrible headache|worst headache|blurry vision|vision changes|flashing lights|face.*swollen|hands.*swollen|swollen.*face|swollen.*hands)\b/i },
  { name: "reduced_fetal_movement", pattern: /\b(baby.*not moving|baby.*moving less|movement.*stopped|reduced fetal movement|slower movement)\b/i }
];

const yellowRules = [
  { name: "emotional_decline", pattern: /\b(cry|crying|overwhelmed|hopeless|anxious|panic|disconnected|numb|sad|failing)\b/i },
  { name: "moderate_symptoms", pattern: /\b(pain|bleeding|fever|swelling|dizzy|nausea|vomit|headache)\b/i },
  { name: "patient_intuition", pattern: /\b(something is wrong|not right|worried|scared)\b/i }
];

export function applyMaternalGuardrails({ llmResult, transcript, phase, memory }) {
  const overrides = [];
  let triage = llmResult.triageCandidate || "yellow";
  const lower = transcript.toLowerCase();
  const safetyDenial = /(do not|don't|dont|no thoughts of|not going to|would never).{0,30}(hurt myself|harm myself|hurt the baby|harm the baby)/i.test(transcript);

  for (const rule of redRules) {
    if (safetyDenial && (rule.name === "self_harm" || rule.name === "baby_harm")) {
      continue;
    }
    if (rule.pattern.test(transcript)) {
      triage = "red";
      overrides.push(rule.name);
    }
  }

  for (const rule of yellowRules) {
    if (triage === "green" && rule.pattern.test(transcript)) {
      triage = "yellow";
      overrides.push(rule.name);
    }
  }

  if (persistentMoodDecline(memory) && triage === "green") {
    triage = "yellow";
    overrides.push("persistent_mood_decline");
  }

  const doctorSummary = { ...llmResult.doctorSummary };
  if (triage === "red") {
    doctorSummary.needed = true;
    if (doctorSummary.urgency === "none" || doctorSummary.urgency === "routine") {
      doctorSummary.urgency = lower.includes("kill myself") || lower.includes("hurt the baby") ? "emergency" : "urgent";
    }
    if (!doctorSummary.reason) doctorSummary.reason = "Deterministic maternal red-flag rule triggered.";
    if (!doctorSummary.clinicalSummary) {
      doctorSummary.clinicalSummary = `Patient in ${phase} reported: "${transcript}". Red-flag rule triggered. Recommend urgent clinician review.`;
    }
  }

  return {
    ...llmResult,
    triage,
    doctorSummary,
    guardrailOverrides: overrides
  };
}

function persistentMoodDecline(memory) {
  const recent = memory?.recent || [];
  const worseningCount = recent
    .slice(-3)
    .filter((entry) => entry.memoryUpdate?.moodTrend === "worsening" || entry.memoryUpdate?.confidenceTrend === "worsening")
    .length;
  return worseningCount >= 2;
}
