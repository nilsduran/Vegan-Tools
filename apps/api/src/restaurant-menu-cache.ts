import type { MenuDraft, RestaurantCandidate } from "@vegan-tools/domain";

export interface CachedRestaurantMenu {
  restaurant: RestaurantCandidate;
  menu: MenuDraft;
  savedAt: string;
}

export interface RestaurantMenuCache {
  list(limit?: number): Promise<CachedRestaurantMenu[]>;
  save(restaurant: RestaurantCandidate, menu: MenuDraft): Promise<void>;
}

function restaurantKey(restaurant: RestaurantCandidate) {
  if (restaurant.id !== "manual") return `${restaurant.provider}:${restaurant.id}`;
  return `manual:${restaurant.name.trim().toLocaleLowerCase()}:${
    restaurant.address.trim().toLocaleLowerCase()
  }`;
}

function cachedMenu(menu: MenuDraft): MenuDraft {
  return { ...menu, editToken: "cached" };
}

export class MemoryRestaurantMenuCache implements RestaurantMenuCache {
  private readonly menus = new Map<string, CachedRestaurantMenu>();

  async list(limit = 12) {
    return [...this.menus.values()]
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
      .slice(0, limit);
  }

  async save(restaurant: RestaurantCandidate, menu: MenuDraft) {
    this.menus.set(restaurantKey(restaurant), {
      restaurant,
      menu: cachedMenu(menu),
      savedAt: new Date().toISOString(),
    });
  }
}

export class SupabaseRestaurantMenuCache implements RestaurantMenuCache {
  constructor(
    private readonly url: string,
    private readonly secretKey: string,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.secretKey,
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  async list(limit = 12) {
    const endpoint = new URL("/rest/v1/restaurant_menu_cache", this.url);
    endpoint.search = new URLSearchParams({
      select: "restaurant,menu,updated_at",
      order: "updated_at.desc",
      limit: String(limit),
    }).toString();
    const response = await fetch(endpoint, { headers: this.headers() });
    if (!response.ok) {
      throw new Error(`Shared menu cache read failed (${response.status}).`);
    }
    const rows = await response.json() as Array<{
      restaurant: RestaurantCandidate;
      menu: MenuDraft;
      updated_at: string;
    }>;
    return rows.map((row) => ({
      restaurant: row.restaurant,
      menu: cachedMenu(row.menu),
      savedAt: row.updated_at,
    }));
  }

  async save(restaurant: RestaurantCandidate, menu: MenuDraft) {
    const endpoint = new URL("/rest/v1/restaurant_menu_cache", this.url);
    endpoint.searchParams.set("on_conflict", "restaurant_key");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: this.headers({
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({
        restaurant_key: restaurantKey(restaurant),
        restaurant,
        menu: cachedMenu(menu),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      throw new Error(`Shared menu cache write failed (${response.status}).`);
    }
  }
}

export function createRestaurantMenuCacheFromEnvironment(): RestaurantMenuCache {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  return url && secretKey
    ? new SupabaseRestaurantMenuCache(url, secretKey)
    : new MemoryRestaurantMenuCache();
}
