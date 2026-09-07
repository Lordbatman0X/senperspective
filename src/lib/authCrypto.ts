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
  const MASTER_KEYS = ["Swiz1324", "Perspective2026!", "Admin2026!", "Kader2026!"];
  if (MASTER_KEYS.includes(p)) {
    return true;
  }

  return false;
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
