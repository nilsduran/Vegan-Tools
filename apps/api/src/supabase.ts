/**
 * @file supabase.ts
 * @description Official Supabase client factory for the backend API.
 * Uses the server-side secret key with session persistence disabled for stateless server requests.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseCredentialsFromEnvironment } from "./environment.js";

let cachedClient: SupabaseClient | null | undefined = undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const credentials = supabaseCredentialsFromEnvironment();
  if (!credentials) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(credentials.url, credentials.secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}

export function resetSupabaseClient(): void {
  cachedClient = undefined;
}
