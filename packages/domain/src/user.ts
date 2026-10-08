/**
 * @file user.ts
 * @description User domain validation, handle normalization, and ethical moderation filters.
 */

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 25);
}

/**
 * Reserved usernames that cannot be claimed by regular registrations or modifications.
 * The handle "nils" (case-insensitive, e.g. "nils", "Nils") is exclusively reserved for the project founder (nilsdula@gmail.com).
 */
export const RESERVED_USERNAMES_MAP: Record<string, string[]> = {
  nils: ["nilsdula@gmail.com"],
};

export const SYSTEM_RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "moderator",
  "root",
  "vegantools",
  "vegantool",
  "vegan_tools",
];

export function isUsernameReserved(username: string, allowedEmail?: string): boolean {
  const normalized = normalizeUsername(username).toLowerCase();

  if (SYSTEM_RESERVED_USERNAMES.includes(normalized)) {
    return true;
  }

  const allowedEmails = RESERVED_USERNAMES_MAP[normalized];
  if (allowedEmails) {
    if (!allowedEmail) return true;
    return !allowedEmails.some((email) => email.toLowerCase() === allowedEmail.trim().toLowerCase());
  }

  return false;
}

export function validateUsername(
  raw: string,
  options?: { email?: string }
): { valid: boolean; error?: string } {
  const clean = normalizeUsername(raw);
  if (!clean || clean.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters." };
  }
  if (clean.length > 25) {
    return { valid: false, error: "Username must be at most 25 characters." };
  }

  // Prevent impersonation of the official project:
  // Disallow any username combining 'vegan' and 'tool' (or 'tools') regardless of casing, punctuation or symbols.
  const simplified = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (simplified.includes("vegan") && (simplified.includes("tool") || simplified.includes("tools"))) {
    return {
      valid: false,
      error: "Usernames cannot combine 'vegan' and 'tool' to avoid confusion with official accounts.",
    };
  }

  // Check reserved usernames (nils, admin, etc.)
  if (isUsernameReserved(clean, options?.email)) {
    return {
      valid: false,
      error: "This username is reserved.",
    };
  }

  return { valid: true };
}
