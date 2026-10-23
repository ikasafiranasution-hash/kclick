/**
 * Firebase Client Configuration Loader
 * 
 * Membaca konfigurasi Firebase langsung dari environment variables (VITE_FIREBASE_*).
 * Dilengkapi sanitizer otomatis untuk membersihkan kutip ganda/tunggal maupun koma ekstra
 * jika pengguna menyalin langsung dari format object Javascript.
 */

function cleanEnvValue(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  let val = raw.trim();
  // Strip trailing commas, semicolons, or newlines
  val = val.replace(/[,;\r\n]+$/, '').trim();
  // Strip surrounding quotes or backticks repeatedly (handles nested quotes like "\"value\"," or '"value"')
  while (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'")) ||
    (val.startsWith('`') && val.endsWith('`'))
  ) {
    val = val.slice(1, -1).trim();
    val = val.replace(/[,;\r\n]+$/, '').trim();
  }
  return val;
}

const apiKey = cleanEnvValue(import.meta.env.VITE_FIREBASE_API_KEY);
const authDomain = cleanEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
const projectId = cleanEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID);
const storageBucket = cleanEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
const messagingSenderId = cleanEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
const appId = cleanEnvValue(import.meta.env.VITE_FIREBASE_APP_ID);
let rawDbId = cleanEnvValue(import.meta.env.VITE_FIREBASE_DATABASE_ID) || '(default)';
if (!rawDbId || rawDbId === projectId) {
  rawDbId = '(default)';
}
const firestoreDatabaseId = rawDbId;

export const isFirebaseConfigured = Boolean(
  apiKey && 
  projectId && 
  apiKey !== 'mock-api-key' && 
  !apiKey.includes('YOUR_') &&
  apiKey.length > 10
);

if (!isFirebaseConfigured) {
  console.warn("Firebase configuration is missing or incomplete.");
}

export const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  firestoreDatabaseId,
};

export default firebaseConfig;
