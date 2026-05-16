import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const memoryPath = path.join(dataDir, "memory.json");

export async function loadMemory(patientId) {
  const all = await readAll();
  return all[patientId] || emptyMemory();
}

export async function updateMemory(patientId, entry) {
  const all = await readAll();
  const current = all[patientId] || emptyMemory();
  current.recent = [...current.recent, entry].slice(-12);
  current.profile = summarizeProfile(current.profile || {}, entry);
  current.updatedAt = entry.timestamp;
  all[patientId] = current;
  await mkdir(dataDir, { recursive: true });
  await writeFile(memoryPath, JSON.stringify(all, null, 2));
  return current;
}

export async function resetMemory(patientId) {
  const all = await readAll();
  delete all[patientId];
  await mkdir(dataDir, { recursive: true });
  await writeFile(memoryPath, JSON.stringify(all, null, 2));
}

async function readAll() {
  try {
    return JSON.parse(await readFile(memoryPath, "utf8"));
  } catch {
    return {};
  }
}

function emptyMemory() {
  return {
    profile: {
      totalCheckins: 0,
      latestPhase: null,
      highestTriage: "none",
      moodTrend: "unknown",
      confidenceTrend: "unknown",
      repeatedSignals: []
    },
    recent: []
  };
}

function summarizeProfile(profile, entry) {
  const repeatedSignals = new Set(profile.repeatedSignals || []);
  for (const signal of [
    ...(entry.symptoms || []),
    ...(entry.emotionalSignals || []),
    ...(entry.memoryUpdate?.newRiskSignals || [])
  ]) {
    if (signal) repeatedSignals.add(signal);
  }

  return {
    totalCheckins: Number(profile.totalCheckins || 0) + 1,
    latestPhase: entry.phase,
    highestTriage: highestTriage(profile.highestTriage, entry.finalTriage),
    moodTrend: entry.memoryUpdate?.moodTrend || profile.moodTrend || "unknown",
    confidenceTrend: entry.memoryUpdate?.confidenceTrend || profile.confidenceTrend || "unknown",
    repeatedSignals: Array.from(repeatedSignals).slice(-10)
  };
}

function highestTriage(previous = "none", next = "green") {
  const rank = { none: 0, green: 1, yellow: 2, red: 3 };
  return rank[next] > rank[previous] ? next : previous;
}
