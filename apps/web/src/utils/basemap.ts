/**
 * @file basemap.ts
 * @description Basemap chain for the restaurant map. The first source that works is used; if a
 * source fails (missing key, quota, network, WebGL unavailable) the next one takes over.
 *
 * Order (see docs/architecture.md §Basemap):
 *   1. CARTO Voyager, raster (needs VITE_CARTO_API_KEY)
 *   2. Geoapify OSM Bright Smooth, raster (needs VITE_GEOAPIFY_API_KEY)
 *   3. OpenFreeMap vector, no key (needs WebGL)
 *   4. OpenStreetMap raster, last resort (never the default: OSM tile usage policy)
 */
import L from "leaflet";

export type BasemapTheme = "light" | "dark";

export interface BasemapKeys {
  cartoKey?: string;
  geoapifyKey?: string;
}

export interface BasemapOptions {
  webgl: boolean;
  /** Map container; gets the `map-tiles-osm` class only when the OSM raster source is used. */
  container: HTMLElement;
}

export interface BasemapHandle {
  setTheme(theme: BasemapTheme): void;
  remove(): void;
}

interface RasterSource {
  kind: "raster";
  id: string;
  attribution: string;
  urlFor(theme: BasemapTheme): string;
}

interface VectorSource {
  kind: "vector";
  id: string;
  attribution: string;
  styleFor(theme: BasemapTheme): string;
}

type BasemapSource = RasterSource | VectorSource;

/** Consecutive tile errors, before any successful tile, after which a raster source is abandoned. */
const RASTER_ERROR_LIMIT = 6;

const OPENSTREETMAP_CREDIT =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

const CARTO_ATTRIBUTION = `${OPENSTREETMAP_CREDIT} contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>`;

const GEOAPIFY_ATTRIBUTION = `Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> | ${OPENSTREETMAP_CREDIT} contributors`;

const OPENFREEMAP_ATTRIBUTION =
  '&copy; <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ' +
  OPENSTREETMAP_CREDIT;

const OSM_RASTER_ATTRIBUTION = `${OPENSTREETMAP_CREDIT} contributors`;

const OPENFREEMAP_STYLES: Record<BasemapTheme, string> = {
  // Positron has no POI icons competing with our pins.
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

/**
 * Ordered chain for the given keys and WebGL support. Sources without a key, or vector sources
 * on a device without WebGL, are left out.
 */
export function basemapChain(keys: BasemapKeys, webgl: boolean): BasemapSource[] {
  const chain: BasemapSource[] = [];
  const cartoKey = keys.cartoKey?.trim();
  const geoapifyKey = keys.geoapifyKey?.trim();

  if (cartoKey) {
    chain.push({
      kind: "raster",
      id: "carto-voyager",
      attribution: CARTO_ATTRIBUTION,
      urlFor: (theme) =>
        `https://basemaps.cartocdn.com/rastertiles/${theme === "dark" ? "dark_all" : "voyager"}/{z}/{x}/{y}.png?key=${encodeURIComponent(cartoKey)}`,
    });
  }

  if (geoapifyKey) {
    chain.push({
      kind: "raster",
      id: "geoapify-osm-bright-smooth",
      attribution: GEOAPIFY_ATTRIBUTION,
      urlFor: () =>
        `https://maps.geoapify.com/v1/tile/osm-bright-smooth/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(geoapifyKey)}`,
    });
  }

  if (webgl) {
    chain.push({
      kind: "vector",
      id: "openfreemap",
      attribution: OPENFREEMAP_ATTRIBUTION,
      styleFor: (theme) => OPENFREEMAP_STYLES[theme],
    });
  }

  chain.push({
    kind: "raster",
    id: "openstreetmap",
    attribution: OSM_RASTER_ATTRIBUTION,
    urlFor: () => "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  });

  return chain;
}

/** Detects WebGL support in the current browser. */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Adds the first working basemap to `map` and moves to the next one when a source fails.
 * The returned handle switches the theme and removes the basemap when the map is destroyed.
 */
export function attachBasemap(
  map: L.Map,
  initialTheme: BasemapTheme,
  keys: BasemapKeys,
  options: BasemapOptions,
): BasemapHandle {
  const chain = basemapChain(keys, options.webgl);
  let theme = initialTheme;
  let index = -1;
  let current: BasemapHandle | null = null;
  let destroyed = false;

  const useNext = (reason?: string) => {
    if (destroyed) return;
    current?.remove();
    current = null;
    index += 1;
    const source = chain[index];
    if (!source) {
      console.warn("[basemap] No basemap source could be loaded.");
      return;
    }
    if (reason) {
      console.warn(`[basemap] ${reason}. Trying ${source.id}.`);
    }
    options.container.classList.toggle("map-tiles-osm", source.id === "openstreetmap");
    current = source.kind === "raster" ? mountRaster(source) : mountVector(source);
  };

  const mountRaster = (source: RasterSource): BasemapHandle => {
    let active = true;
    let loaded = false;
    let errors = 0;
    const layer = L.tileLayer(source.urlFor(theme), {
      attribution: source.attribution,
      subdomains: "abc",
      maxNativeZoom: 19,
      maxZoom: 20,
    });
    layer.on("tileload", () => {
      loaded = true;
    });
    layer.on("tileerror", () => {
      if (!active || loaded) return;
      errors += 1;
      if (errors >= RASTER_ERROR_LIMIT) {
        active = false;
        useNext(`${source.id} tiles keep failing`);
      }
    });
    layer.addTo(map);
    return {
      setTheme(next) {
        if (active) layer.setUrl(source.urlFor(next));
      },
      remove() {
        active = false;
        layer.remove();
      },
    };
  };

  const mountVector = (source: VectorSource): BasemapHandle => {
    let active = true;
    let layer: (L.Layer & { getMaplibreMap(): { setStyle(style: string): unknown } }) | null = null;

    Promise.all([
      import("maplibre-gl"),
      import("@maplibre/maplibre-gl-leaflet"),
      // MapLibre resolves its worker next to its own chunk by default, which Vite doesn't emit;
      // point it at the hashed asset explicitly (works in dev and production).
      import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
      import("maplibre-gl/dist/maplibre-gl.css"),
    ])
      .then(([maplibre, bridge, worker]) => {
        if (!active) return;
        maplibre.setWorkerUrl(worker.default);
        const created = bridge.maplibreGL({
          style: source.styleFor(theme),
          attributionControl: { customAttribution: source.attribution },
        }) as unknown as NonNullable<typeof layer>;
        created.addTo(map);
        layer = created;
      })
      .catch((error: unknown) => {
        if (!active) return;
        active = false;
        useNext(`${source.id} failed to load (${String(error)})`);
      });

    return {
      setTheme(next) {
        layer?.getMaplibreMap().setStyle(source.styleFor(next));
      },
      remove() {
        active = false;
        layer?.remove();
      },
    };
  };

  useNext();

  return {
    setTheme(next) {
      theme = next;
      current?.setTheme(next);
    },
    remove() {
      destroyed = true;
      current?.remove();
      current = null;
    },
  };
}
