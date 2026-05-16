import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");

export async function recordPioneerEvent(event) {
  await mkdir(dataDir, { recursive: true });
  await appendFile(path.join(dataDir, "pioneer-events.jsonl"), `${JSON.stringify(event)}\n`);

  if (!process.env.PIONEER_API_KEY || !process.env.PIONEER_API_URL) {
    return { provider: "local-pioneer-log", status: "logged" };
  }

  try {
    const response = await fetch(process.env.PIONEER_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.PIONEER_API_KEY}`
      },
      body: JSON.stringify(event)
    });
    return { provider: "pioneer", status: response.ok ? "sent" : "failed" };
  } catch {
    return { provider: "pioneer", status: "failed-local-log-kept" };
  }
}

