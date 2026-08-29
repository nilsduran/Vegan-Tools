/**
 * Generates a standard UUID v4 safely across all browsers and contexts
 * (including non-HTTPS LAN connections on mobile devices where crypto.randomUUID is unavailable).
 */
export function generateSafeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if security policy disables crypto in current context
    }
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    try {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6]! & 0x0f) | 0x40; // Version 4
      buf[8] = (buf[8]! & 0x3f) | 0x80; // Variant RFC4122
      return Array.from(buf, (b) => b.toString(16).padStart(2, "0"))
        .join("")
        .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    } catch {
      // Fallback
    }
  }

  // Math.random fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
