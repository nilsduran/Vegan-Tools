import { describe, expect, it, vi } from "vitest";
import { UsageCounters } from "./usage-counters.js";

describe("UsageCounters", () => {
  it("adds up counts per day and metric without a database", async () => {
    const counters = new UsageCounters(null);
    counters.increment("menus.cache.hit");
    counters.increment("menus.cache.hit");
    counters.increment("gemini.menu.tokens", 1200);
    counters.increment("ignored", 0);
    const day = new Date().toISOString().slice(0, 10);
    expect(counters.peek()).toEqual({ [`${day}|menus.cache.hit`]: 2, [`${day}|gemini.menu.tokens`]: 1200 });
    await counters.flush();
    expect(Object.keys(counters.peek())).toHaveLength(2);
  });

  it("writes batches to Supabase and keeps counts that failed", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "down" } });
    const counters = new UsageCounters({ rpc } as never);
    counters.increment("a");
    counters.increment("b", 3);
    await counters.flush();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(Object.values(counters.peek())).toEqual([3]);
  });
});
