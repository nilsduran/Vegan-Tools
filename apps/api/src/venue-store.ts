/**
 * @file venue-store.ts
 * @description System of Record (SoR) repository for venues and lifecycle events.
 * Implements DDIA principles: event sourcing audit trail, tombstone guards, and PostGIS spatial querying.
 */

import type { RestaurantCandidate } from "@vegan-tools/domain";
import { isPermanentlyClosedVenue } from "@vegan-tools/domain";
import { FEATURED_RESTAURANTS } from "@vegan-tools/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase.js";

export type VenueLifecycleStatus =
  | "proposed"
  | "verified_active"
  | "under_review"
  | "temporarily_closed"
  | "permanently_closed";

export interface VenueRecord extends RestaurantCandidate {
  status: VenueLifecycleStatus;
  closedAt?: string;
  closureReason?: string;
  version: number;
  cityHub?: string;
}

export interface VenueSearchOptions {
  query?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  cityHub?: string;
  includeUnderReview?: boolean;
}

export interface VenueStore {
  getVenue(id: string): Promise<VenueRecord | undefined>;
  searchVenues(options: VenueSearchOptions): Promise<VenueRecord[]>;
  getCuratedVenues(hub?: string): Promise<VenueRecord[]>;
  saveVenue(venue: VenueRecord, actorId: string, eventType: string, evidence?: string): Promise<void>;
  markVenueClosed(venueId: string, actorId: string, reason: string, evidence?: string): Promise<void>;
  isTombstone(id: string, name?: string): Promise<boolean>;
}

export class MemoryVenueStore implements VenueStore {
  private venues = new Map<string, VenueRecord>();
  private tombstones = new Set<string>();
  private events: Array<{ venueId: string; type: string; actor: string; timestamp: string }> = [];

  constructor() {
    this.seed();
  }

  private seed() {
    for (const r of FEATURED_RESTAURANTS) {
      if (isPermanentlyClosedVenue(r)) {
        this.tombstones.add(r.id);
        if (r.name) this.tombstones.add(r.name.trim().toLowerCase());
        continue;
      }
      this.venues.set(r.id, {
        ...r,
        status: "verified_active",
        version: 1,
      });
    }
  }

  async getVenue(id: string): Promise<VenueRecord | undefined> {
    const venue = this.venues.get(id);
    if (!venue || venue.status === "permanently_closed") return undefined;
    return venue;
  }

  async isTombstone(id: string, name?: string): Promise<boolean> {
    if (this.tombstones.has(id)) return true;
    if (name && this.tombstones.has(name.trim().toLowerCase())) return true;
    const v = this.venues.get(id);
    if (v && v.status === "permanently_closed") return true;
    return isPermanentlyClosedVenue({ id, name });
  }

  async searchVenues(options: VenueSearchOptions): Promise<VenueRecord[]> {
    const query = options.query?.trim().toLowerCase();
    const results: VenueRecord[] = [];

    for (const venue of this.venues.values()) {
      if (venue.status === "permanently_closed") continue;
      if (!options.includeUnderReview && venue.status === "under_review") continue;

      if (query && query.length > 0) {
        const matchesName = venue.name.toLowerCase().includes(query);
        const matchesAddress = (venue.address || "").toLowerCase().includes(query);
        const matchesCuisine = (venue.cuisine || "").toLowerCase().includes(query);
        const matchesTags = (venue.tags || []).some((t) => t.toLowerCase().includes(query));
        if (!matchesName && !matchesAddress && !matchesCuisine && !matchesTags) {
          continue;
        }
      }

      if (options.cityHub && venue.cityHub && venue.cityHub !== options.cityHub) {
        continue;
      }

      results.push(venue);
    }

    return results;
  }

  async getCuratedVenues(hub?: string): Promise<VenueRecord[]> {
    return Array.from(this.venues.values()).filter(
      (v) => v.isFeatured && v.status === "verified_active" && (!hub || v.cityHub === hub),
    );
  }

  async saveVenue(
    venue: VenueRecord,
    actorId: string,
    eventType: string,
  ): Promise<void> {
    if (await this.isTombstone(venue.id, venue.name)) {
      throw new Error(`Cannot modify or resurrect permanently closed venue [${venue.id}]`);
    }

    this.venues.set(venue.id, {
      ...venue,
      version: venue.version + 1,
    });

    this.events.push({
      venueId: venue.id,
      type: eventType,
      actor: actorId,
      timestamp: new Date().toISOString(),
    });
  }

  async markVenueClosed(
    venueId: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    const existing = this.venues.get(venueId);
    if (existing) {
      existing.status = "permanently_closed";
      existing.closedAt = new Date().toISOString();
      existing.closureReason = reason;
      existing.version += 1;
      this.venues.set(venueId, existing);
    }

    this.tombstones.add(venueId);
    if (existing?.name) {
      this.tombstones.add(existing.name.trim().toLowerCase());
    }

    this.events.push({
      venueId,
      type: "CLOSURE_VERIFIED",
      actor: actorId,
      timestamp: new Date().toISOString(),
    });
  }
}

export class SupabaseVenueStore implements VenueStore {
  constructor(
    private readonly client: SupabaseClient,
    private readonly fallback: VenueStore = new MemoryVenueStore(),
  ) {}

  async getVenue(id: string): Promise<VenueRecord | undefined> {
    try {
      const { data, error } = await this.client
        .from("venues")
        .select("*")
        .eq("id", id)
        .neq("status", "permanently_closed")
        .maybeSingle();

      if (error || !data) return this.fallback.getVenue(id);

      return {
        id: data.id,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        websiteUrl: data.website_url,
        cuisine: data.cuisine_type,
        tags: data.tags,
        isVegan: data.classification === "100_percent_vegan",
        isVegetarian: data.classification === "vegetarian",
        isFeatured: data.is_featured,
        status: data.status,
        version: data.version,
        rating: data.rating,
        openingHours: data.opening_hours,
        imageUrl: data.image_url,
        mapUrl: `https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}`,
        provider: "curated",
      };
    } catch {
      return this.fallback.getVenue(id);
    }
  }

  async isTombstone(id: string, name?: string): Promise<boolean> {
    try {
      const { data } = await this.client
        .from("venues")
        .select("id")
        .eq("id", id)
        .eq("status", "permanently_closed")
        .maybeSingle();

      if (data) return true;

      const { data: mapping } = await this.client
        .from("venue_external_mappings")
        .select("venue_id")
        .eq("external_id", id)
        .eq("is_blacklisted", true)
        .maybeSingle();

      if (mapping) return true;
    } catch {
      // Fallback on in-memory heuristics
    }

    return this.fallback.isTombstone(id, name);
  }

  async searchVenues(options: VenueSearchOptions): Promise<VenueRecord[]> {
    try {
      let query = this.client
        .from("venues")
        .select("*")
        .neq("status", "permanently_closed");

      if (!options.includeUnderReview) {
        query = query.neq("status", "under_review");
      }

      if (options.cityHub) {
        query = query.eq("city_hub", options.cityHub);
      }

      if (options.query) {
        query = query.ilike("name", `%${options.query}%`);
      }

      const { data, error } = await query.limit(50);
      if (error || !data || data.length === 0) {
        return this.fallback.searchVenues(options);
      }

      return data.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        websiteUrl: row.website_url,
        mapUrl: `https://www.openstreetmap.org/?mlat=${row.latitude}&mlon=${row.longitude}`,
        cuisine: row.cuisine_type,
        tags: row.tags,
        isVegan: row.classification === "100_percent_vegan",
        isVegetarian: row.classification === "vegetarian",
        isFeatured: row.is_featured,
        status: row.status,
        version: row.version,
        rating: row.rating,
        openingHours: row.opening_hours,
        imageUrl: row.image_url,
        provider: "curated",
      }));
    } catch {
      return this.fallback.searchVenues(options);
    }
  }

  async getCuratedVenues(hub?: string): Promise<VenueRecord[]> {
    return this.fallback.getCuratedVenues(hub);
  }

  async saveVenue(
    venue: VenueRecord,
    actorId: string,
    eventType: string,
    evidence?: string,
  ): Promise<void> {
    if (await this.isTombstone(venue.id, venue.name)) {
      throw new Error(`Cannot modify permanently closed venue [${venue.id}]`);
    }

    try {
      await this.client.from("venues").upsert({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        location: `POINT(${venue.longitude} ${venue.latitude})`,
        classification: venue.isVegan ? "100_percent_vegan" : venue.isVegetarian ? "vegetarian" : "veg_friendly",
        is_featured: venue.isFeatured ?? false,
        status: venue.status,
        cuisine_type: venue.cuisine || "mediterranean",
        tags: venue.tags || [],
        website_url: venue.websiteUrl,
        opening_hours: venue.openingHours,
        rating: venue.rating,
        image_url: venue.imageUrl,
        version: venue.version + 1,
        updated_at: new Date().toISOString(),
      });

      await this.client.from("venue_events").insert({
        venue_id: venue.id,
        event_type: eventType,
        actor_id: actorId,
        payload: venue as unknown as Record<string, unknown>,
        source_evidence: evidence,
      });
    } catch {
      await this.fallback.saveVenue(venue, actorId, eventType, evidence);
    }
  }

  async markVenueClosed(
    venueId: string,
    actorId: string,
    reason: string,
    evidence?: string,
  ): Promise<void> {
    try {
      await this.client
        .from("venues")
        .update({
          status: "permanently_closed",
          closed_at: new Date().toISOString(),
          closure_reason: reason,
        })
        .eq("id", venueId);

      await this.client.from("venue_events").insert({
        venue_id: venueId,
        event_type: "CLOSURE_VERIFIED",
        actor_id: actorId,
        payload: { reason },
        source_evidence: evidence,
      });

      await this.client.from("venue_external_mappings").upsert({
        provider: "vegan_tools",
        external_id: venueId,
        venue_id: venueId,
        is_blacklisted: true,
      });
    } catch {
      await this.fallback.markVenueClosed(venueId, actorId, reason, evidence);
    }
  }
}

let activeVenueStore: VenueStore | undefined;

export function getVenueStore(): VenueStore {
  if (activeVenueStore) return activeVenueStore;

  const client = getSupabaseClient();
  if (client) {
    activeVenueStore = new SupabaseVenueStore(client, new MemoryVenueStore());
  } else {
    activeVenueStore = new MemoryVenueStore();
  }

  return activeVenueStore;
}
