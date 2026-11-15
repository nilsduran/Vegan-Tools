/**
 * @file auth.ts
 * @description Verified authentication for API routes.
 * Bearer tokens are validated against Supabase Auth (signature, expiry and revocation)
 * before any user identity is trusted. Decoding a JWT payload without verifying it is
 * only allowed in tests or when explicitly enabled for local development without Supabase.
 */

import type { FastifyRequest } from "fastify";
import { getSupabaseClient } from "./supabase.js";

export interface AuthUser {
  id: string;
  name: string;
  avatarUrl?: string;
  lifestyle?: "vegan" | "vegetarian" | "non-veg" | "non_veg";
}

/** Resolves a raw bearer token to a verified user, or `undefined` if it is not valid. */
export type TokenVerifier = (token: string) => Promise<AuthUser | undefined>;

interface IdentityClaims {
  id?: unknown;
  email?: unknown;
  user_metadata?: Record<string, unknown> | null;
}

function userFromClaims(claims: IdentityClaims): AuthUser | undefined {
  if (!claims.id) return undefined;
  const metadata = claims.user_metadata ?? {};
  const email = typeof claims.email === "string" ? claims.email : undefined;

  const name =
    metadata.name ||
    metadata.full_name ||
    metadata.user_name ||
    (email ? email.split("@")[0] : undefined) ||
    "Anònim";

  const avatarUrl = metadata.avatar_url || metadata.picture || undefined;

  const rawLifestyle = metadata.lifestyle || metadata.diet;
  const lifestyle =
    rawLifestyle === "vegan" || rawLifestyle === "vegetarian" || rawLifestyle === "non-veg" || rawLifestyle === "non_veg"
      ? rawLifestyle
      : undefined;

  return {
    id: String(claims.id),
    name: String(name),
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    lifestyle,
  };
}

/**
 * Decodes a JWT payload WITHOUT verifying its signature.
 * Never use this where forged tokens matter; see `createTokenVerifier`.
 */
export function decodeUnverifiedToken(token: string): AuthUser | undefined {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return undefined;
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8"));
    return userFromClaims({ ...payload, id: payload.sub });
  } catch {
    return undefined;
  }
}

/**
 * Default verifier:
 * - With Supabase configured, every token is checked by Supabase Auth.
 * - Without Supabase, unverified decoding is only allowed under Vitest (`NODE_ENV=test`)
 *   or with `AUTH_ALLOW_UNVERIFIED_TOKENS=true` for local development. Otherwise all
 *   tokens are rejected, so a misconfigured production server fails closed.
 */
export function createTokenVerifier(): TokenVerifier {
  const supabase = getSupabaseClient();
  if (supabase) {
    return async (token) => {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) return undefined;
      return userFromClaims(data.user);
    };
  }

  const allowUnverified =
    process.env.NODE_ENV === "test" || process.env.AUTH_ALLOW_UNVERIFIED_TOKENS === "true";
  if (allowUnverified) {
    return async (token) => decodeUnverifiedToken(token);
  }

  return async () => undefined;
}

/** Extracts and verifies the bearer token of a request. */
export async function authenticateRequest(
  request: FastifyRequest,
  verifyToken: TokenVerifier,
): Promise<AuthUser | undefined> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return undefined;
  const token = header.slice(7).trim();
  if (!token) return undefined;
  try {
    return await verifyToken(token);
  } catch (error) {
    request.log.warn({ error }, "Token verification failed");
    return undefined;
  }
}
