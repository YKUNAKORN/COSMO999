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

// Fixed RTDB paths. Must stay identical to the legacy app so existing
// data under project dummy-ae198 is preserved.
export const DB_PATHS = {
  players: "dummyRoom/players",
  groups: "dummyRoom/groups",
  history: "dummyRoom/history",
} as const;

export { app };
