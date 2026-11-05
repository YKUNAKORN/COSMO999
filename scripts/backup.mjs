// Saves a read-only JSON snapshot of the Realtime Database room.
//   npm run backup            -> backups/cosmo999-<timestamp>.json
// Reads NEXT_PUBLIC_FIREBASE_DATABASE_URL (and NEXT_PUBLIC_RTDB_ROOT) from the
// environment or from .env.local. Never writes to the database.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const base = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
const root = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";
if (!base) {
  console.error("NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set (.env.local).");
  process.exit(1);
}

const url = `${base.replace(/\/$/, "")}/${root}.json`;
const response = await fetch(url);
if (!response.ok) {
  console.error(`Backup failed: HTTP ${response.status}`);
  process.exit(1);
}
const data = await response.json();

mkdirSync("backups", { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = `backups/cosmo999-${stamp}.json`;
writeFileSync(file, JSON.stringify(data, null, 2));
console.log(`Saved ${file}`);
