import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const memoryPath = path.join(dataDir, "memory.json");

export async function loadMemory(patientId) {
  const all = await readAll();
  return all[patientId] || { recent: [] };
}

export async function updateMemory(patientId, entry) {
  const all = await readAll();
  const current = all[patientId] || { recent: [] };
  current.recent = [...current.recent, entry].slice(-12);
  all[patientId] = current;
  await mkdir(dataDir, { recursive: true });
  await writeFile(memoryPath, JSON.stringify(all, null, 2));
  return current;
}

async function readAll() {
  try {
    return JSON.parse(await readFile(memoryPath, "utf8"));
  } catch {
    return {};
  }
}

