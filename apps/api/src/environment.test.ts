import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseCredentialsFromEnvironment } from "./environment.js";

describe("Supabase environment configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes a valid project URL", () => {
    vi.stubEnv("SUPABASE_URL", " https://project.supabase.co/ ");
    vi.stubEnv("SUPABASE_SECRET_KEY", " sb_secret_test ");

    expect(supabaseCredentialsFromEnvironment()).toEqual({
      url: "https://project.supabase.co",
      secretKey: "sb_secret_test",
    });
  });

  it("allows an entirely unconfigured local fallback", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");

    expect(supabaseCredentialsFromEnvironment()).toBeUndefined();
  });

  it("rejects malformed URLs with actionable guidance", () => {
    vi.stubEnv("SUPABASE_URL", "project.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");

    expect(() => supabaseCredentialsFromEnvironment()).toThrow(
      "SUPABASE_URL must be the project HTTP(S) URL",
    );
  });

  it("rejects partial Supabase configuration", () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");

    expect(() => supabaseCredentialsFromEnvironment()).toThrow(
      "must either both be set or both be omitted",
    );
  });
});
