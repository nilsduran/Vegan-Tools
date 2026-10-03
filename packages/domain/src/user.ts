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

export function validateUsername(raw: string): { valid: boolean; error?: string } {
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

  return { valid: true };
}
