export const maternalSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "phase",
    "summary",
    "detectedSymptoms",
    "emotionalSignals",
    "triageCandidate",
    "assistantText",
    "followUpQuestions",
    "doctorSummary",
    "memoryUpdate"
  ],
  properties: {
    phase: { type: "string" },
    summary: { type: "string" },
    detectedSymptoms: { type: "array", items: { type: "string" } },
    emotionalSignals: { type: "array", items: { type: "string" } },
    triageCandidate: { type: "string", enum: ["green", "yellow", "red"] },
    assistantText: { type: "string" },
    followUpQuestions: { type: "array", items: { type: "string" } },
    doctorSummary: {
      type: "object",
      additionalProperties: false,
      required: ["needed", "urgency", "reason", "clinicalSummary"],
      properties: {
        needed: { type: "boolean" },
        urgency: { type: "string", enum: ["none", "routine", "same_day", "urgent", "emergency"] },
        reason: { type: "string" },
        clinicalSummary: { type: "string" }
      }
    },
    memoryUpdate: {
      type: "object",
      additionalProperties: false,
      required: ["moodTrend", "confidenceTrend", "newRiskSignals", "notes"],
      properties: {
        moodTrend: { type: "string", enum: ["unknown", "stable", "improving", "worsening"] },
        confidenceTrend: { type: "string", enum: ["unknown", "stable", "improving", "worsening"] },
        newRiskSignals: { type: "array", items: { type: "string" } },
        notes: { type: "string" }
      }
    }
  }
};

