// Firebase app initialization and Realtime Database instance.
// All config values come from public env vars (NEXT_PUBLIC_FIREBASE_*).
// Copy .env.example to .env.local and fill in the real values.
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app across hot reloads and server re-evaluation.
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Realtime Database instance shared by the whole app.
export const database: Database = getDatabase(app);

// RTDB paths. The root defaults to "dummyRoom" - the legacy production
// location - so existing data under project dummy-ae198 is untouched. Set
// NEXT_PUBLIC_RTDB_ROOT to something like "dummyRoom_dev" while testing
// writes, then remove it to point back at the real data. The three child
// names (players / groups / history) never change.
// `||` not `??`: an env var that is set but empty must still fall back to
// the production root, otherwise every path would resolve at the DB root.
const RTDB_ROOT = process.env.NEXT_PUBLIC_RTDB_ROOT || "dummyRoom";

export const DB_PATHS = {
  // Whole-room node. The phase 2d atomic round save transacts on this path
  // (never a hardcoded "dummyRoom") so it honours NEXT_PUBLIC_RTDB_ROOT too.
  root: RTDB_ROOT,
  players: `${RTDB_ROOT}/players`,
  groups: `${RTDB_ROOT}/groups`,
  history: `${RTDB_ROOT}/history`,
} as const;

export { app };
