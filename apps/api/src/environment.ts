export interface SupabaseCredentials {
  url: string;
  secretKey: string;
}

export function supabaseCredentialsFromEnvironment():
  | SupabaseCredentials
  | undefined {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!rawUrl && !secretKey) return undefined;
  if (!rawUrl || !secretKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY must either both be set or both be omitted.",
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(
      "SUPABASE_URL must be the project HTTP(S) URL, for example https://your-project.supabase.co. Do not use a database connection string or dashboard URL.",
    );
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(
      "SUPABASE_URL must start with https:// (or http:// for a local self-hosted project).",
    );
  }

  return {
    url: url.origin,
    secretKey,
  };
}
