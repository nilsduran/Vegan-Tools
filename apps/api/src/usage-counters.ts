/**
 * @file usage-counters.ts
 * @description Aggregate daily counters for the beta: how many menus are read, how often
 * the menu cache answers, how many Gemini calls and tokens each feature uses, and which
 * routes fail. Only counts: never user ids, locations, search terms or restaurant ids.
 *
 * Increments are kept in memory and written to Supabase (`usage_counters`) once a
 * minute and on shutdown, so a request never waits for them. Without Supabase they
 * stay in memory (tests, local development).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase.js";

const FLUSH_INTERVAL_MS = 60_000;

export class UsageCounters {
  private pending = new Map<string, number>();
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly client: SupabaseClient | null) {}

  /** Adds `amount` to today's (UTC) counter for `metric`. */
  increment(metric: string, amount = 1): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const key = `${new Date().toISOString().slice(0, 10)}|${metric}`;
    this.pending.set(key, (this.pending.get(key) ?? 0) + Math.round(amount));
    if (this.client && !this.timer) {
      this.timer = setTimeout(() => void this.flush(), FLUSH_INTERVAL_MS);
      this.timer.unref?.();
    }
  }

  /** Counts not yet written, keyed by "day|metric" (used by tests). */
  peek(): Record<string, number> {
    return Object.fromEntries(this.pending);
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.client || this.pending.size === 0) return;
    const batch = this.pending;
    this.pending = new Map();
    for (const [key, amount] of batch) {
      const [day, metric] = key.split("|") as [string, string];
      const { error } = await this.client.rpc("increment_usage_counter", {
        p_day: day,
        p_metric: metric,
        p_amount: amount,
      });
      // Counters are best effort: put the count back and try again next time.
      if (error) this.pending.set(key, (this.pending.get(key) ?? 0) + amount);
    }
  }
}

export const usageCounters = new UsageCounters(getSupabaseClient());

/** Records one Gemini call and its tokens for a feature (menu, website, label, feedback). */
export function recordGeminiCall(
  feature: string,
  response: { usageMetadata?: { totalTokenCount?: number } } | undefined,
): void {
  usageCounters.increment(`gemini.${feature}.calls`);
  usageCounters.increment(`gemini.${feature}.tokens`, response?.usageMetadata?.totalTokenCount ?? 0);
}
