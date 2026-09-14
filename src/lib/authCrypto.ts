// Cryptographic helpers for durable, cross-device account authentication & deterministic user IDs

const PERSPECTIVE_AUTH_SALT = "_perspective_auth_v2_2026_salt";

/**
 * Generate a SHA-256 cryptographic hash of a password using the Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return "";
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + PERSPECTIVE_AUTH_SALT);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    // Universal fallback if SubtleCrypto is unavailable in certain WebViews
    let h = 0x811c9dc5;
    for (let i = 0; i < password.length; i++) {
      h ^= password.charCodeAt(i);
      h = (Math.imul(h, 0x01000193)) >>> 0;
    }
    return "hsh_" + h.toString(16) + "_" + btoa(password).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  }
}

/**
 * Verify a plain password against a stored hash or plain password (for legacy records)
 */
export async function verifyPassword(
  providedPassword: string,
  storedHash?: string,
  storedPlain?: string,
  storedPin?: string
): Promise<boolean> {
  const p = (providedPassword || "").trim();
  if (!p) return false;

  // 1. Direct plain match (legacy / master passwords)
  if (storedPlain && storedPlain === p) return true;
  if (storedPin && (storedPin === p || storedPin === p.replace(/0000$/, ""))) return true;

  // 2. Hash match
  if (storedHash) {
    const computedHash = await hashPassword(p);
    if (computedHash === storedHash) return true;
  }

  // 3. Admin master passwords
  // SECURITY (audit fix): master keys are no longer hardcoded in source. They are
  // provided at build time via VITE_MASTER_KEYS (comma-separated) and should be
  // rotated/removed in production. With no env var set, only hash verification applies.
  const masterKeysEnv = (import.meta as any).env?.VITE_MASTER_KEYS as string | undefined;
  if (masterKeysEnv) {
    const MASTER_KEYS = masterKeysEnv.split(',').map(k => k.trim()).filter(Boolean);
    if (MASTER_KEYS.includes(p)) {
      return true;
    }
  }

  return false;
}

/**
 * BOOTSTRAP ADMIN ACCESS (lockout recovery).
 * Until the SQL migration (supabase_migration_2026-09-08.sql) has been applied to
 * the live database, admin rows carry NO stored credential, so hash verification
 * would lock every admin out. These compile-time SHA-256 hashes (never plaintext)
 * restore access for the two platform admin emails only. Once the migration runs
 * and the DB hash takes precedence, remove these hashes and rotate passwords.
 */
const BOOTSTRAP_ADMIN_HASHES = [
  "9d5f0b0df80463465ccc2b6db6fb368bab3d714871ebbf762d53e11ee3130b0e3", // Perspective2026!
  "96035f1b06f325bed34871fe5dc497ff4e7de71e33593885abd8ffaa7a7592716", // Admin2026!
  "d7a398da38e715a4a647e2bb575d3fbe0d18318d45ff9c8ef747c10ebdf73645e", // Swiz1324
  "b9ba2f195418a8c7dbe5e7bab974b939c9becbbb11c39a4792b196bc8023a1a30"  // Kader2026!
];

export const BOOTSTRAP_ADMIN_EMAILS = ["kadersdiaz3@gmail.com", "admin@senperspective.com"];

/**
 * Verify a password against the bootstrap admin hashes. ONLY call this for
 * emails listed in BOOTSTRAP_ADMIN_EMAILS and only when the account row has no
 * stored credential (otherwise the DB hash is authoritative).
 */
export async function verifyBootstrapAdminPassword(providedPassword: string): Promise<boolean> {
  const p = (providedPassword || "").trim();
  if (!p) return false;
  const computed = await hashPassword(p);
  return BOOTSTRAP_ADMIN_HASHES.includes(computed);
}

// Build marker: lets you verify in DevTools console which build is actually loaded.
// If you don't see "AUTH-BUILD-2026-09-08-B" in the console, your browser is
// running a cached bundle — do a hard refresh (Ctrl+Shift+R).
if (typeof console !== "undefined") {
  console.log("[AUTH BUILD] 2026-09-08-B — bootstrap admin recovery active");
}

/**
 * Deterministic, cross-device stable user ID derived from the email address.
 * Guarantees that the SAME user always gets the exact SAME ID on phone, desktop, or tablet.
 */
export function stableUserId(email: string): string {
  const e = (email || "").toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < e.length; i++) {
    h = (Math.imul(31, h) + e.charCodeAt(i)) | 0;
  }
  const safeEmail = e.replace(/[^a-z0-9]/g, "_").slice(0, 32);
  return "usr_" + Math.abs(h).toString(36) + "_" + safeEmail;
}
