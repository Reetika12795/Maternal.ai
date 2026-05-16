import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");

export async function routeMaternalEscalation(payload) {
  await mkdir(dataDir, { recursive: true });
  await appendFile(path.join(dataDir, "escalations.jsonl"), `${JSON.stringify(payload)}\n`);

  if (!process.env.SLNG_API_KEY || !process.env.SLNG_BASE_URL) {
    return {
      provider: "local-escalation-log",
      status: "logged",
      note: "SLNG is not fully configured. Escalation was logged locally."
    };
  }

  const url = `${process.env.SLNG_BASE_URL.replace(/\/$/, "")}/maternal/escalations`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.SLNG_API_KEY}`
    },
    body: JSON.stringify({
      agentId: process.env.SLNG_AGENT_ID,
      ...payload
    })
  });

  if (!response.ok) {
    return {
      provider: "slng",
      status: "failed-local-log-kept",
      error: `SLNG escalation failed with ${response.status}`,
      note: "Check SLNG_BASE_URL and route shape for the hackathon API."
    };
  }

  return {
    provider: "slng",
    status: "sent",
    response: await safeJson(response)
  };
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

