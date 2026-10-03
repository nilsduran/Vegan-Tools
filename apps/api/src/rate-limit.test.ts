import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("API Rate Limiting & User Protection", () => {
  it("enforces rate limits when enabled and returns 429 Too Many Requests when exceeded", async () => {
    // Instantiate app with rate limiting explicitly enabled and a small threshold for testing
    const app = await buildApp({
      disableRateLimit: false,
      rateLimitMax: 3,
    });

    try {
      // 1st request -> 200 OK
      const res1 = await app.inject({ method: "GET", url: "/" });
      expect(res1.statusCode).toBe(200);
      expect(res1.headers["x-ratelimit-limit"]).toBe("3");
      expect(res1.headers["x-ratelimit-remaining"]).toBe("2");

      // 2nd request -> 200 OK
      const res2 = await app.inject({ method: "GET", url: "/" });
      expect(res2.statusCode).toBe(200);
      expect(res2.headers["x-ratelimit-remaining"]).toBe("1");

      // 3rd request -> 200 OK
      const res3 = await app.inject({ method: "GET", url: "/" });
      expect(res3.statusCode).toBe(200);
      expect(res3.headers["x-ratelimit-remaining"]).toBe("0");

      // 4th request -> 429 Too Many Requests
      const res4 = await app.inject({ method: "GET", url: "/" });
      expect(res4.statusCode).toBe(429);
      const body = JSON.parse(res4.body);
      expect(body.statusCode).toBe(429);
      expect(body.error).toBe("Too Many Requests");
      expect(res4.headers["retry-after"]).toBeDefined();
    } finally {
      await app.close();
    }
  });

  it("exempts healthcheck and documentation endpoints from rate limits", async () => {
    const app = await buildApp({
      disableRateLimit: false,
      rateLimitMax: 2,
    });

    try {
      // Exhaust the limit on "/"
      await app.inject({ method: "GET", url: "/" });
      await app.inject({ method: "GET", url: "/" });
      const blocked = await app.inject({ method: "GET", url: "/" });
      expect(blocked.statusCode).toBe(429);

      // /health should still return 200 without being rate-limited
      const health = await app.inject({ method: "GET", url: "/health" });
      expect(health.statusCode).toBe(200);
      expect(health.body).toBe("ok");
    } finally {
      await app.close();
    }
  });

  it("bypasses rate limiting in tests by default to guarantee automated test stability", async () => {
    // When no rateLimit options are passed in test environment, rate limiting is disabled
    const app = await buildApp();

    try {
      // Send 10 rapid requests without being throttled
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({ method: "GET", url: "/" });
        expect(res.statusCode).toBe(200);
      }
    } finally {
      await app.close();
    }
  });
});
