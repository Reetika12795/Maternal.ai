import assert from "node:assert/strict";

import { getBloomContext } from "../src/bloom.js";
import { fallbackTriage } from "../src/openai.js";
import { applyMaternalGuardrails } from "../src/triageRules.js";

const phase = "pregnancy_month_8";
const transcript = "I have a terrible headache, my vision is blurry, and my hands and face are swollen.";
const bloom = getBloomContext(phase);
const llmResult = fallbackTriage({
  transcript,
  phase,
  bloom,
  memory: { recent: [] },
  patient: { id: "test" }
});

const finalResult = applyMaternalGuardrails({
  llmResult,
  transcript,
  phase,
  bloom,
  memory: { recent: [] }
});

assert.equal(bloom.title, "Birth Preparation");
assert.equal(finalResult.triage, "red");
assert.equal(finalResult.doctorSummary.needed, true);

console.log("Smoke test passed: BLOOM context, fallback triage, and red guardrail work.");

