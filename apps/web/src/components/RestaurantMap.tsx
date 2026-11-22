/**
 * @file RestaurantMap.tsx
 * @description Interactive Leaflet map for discovering vegan & vegan-friendly dining options.
 * Handles marker clustering, user geolocation tracking, viewport boundary queries,
 * cuisine-specific icon badges, and selection events.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getCuisineIcon } from "../utils/cuisine-icon";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, LoaderCircle, Maximize2, Search } from "lucide-react";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import { getApproximateLocation } from "../api";
import { clusterPoints } from "../utils/cluster";
import { tx, useLanguage } from "../i18n";
import { useTheme } from "../theme";

function distanceInMeters(left: L.LatLng, right: L.LatLng): number {
  const earthRadius = 6_371_000;
  const latDelta = ((right.lat - left.lat) * Math.PI) / 180;
  const lngDelta = ((right.lng - left.lng) * Math.PI) / 180;
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos((left.lat * Math.PI) / 180) *
      Math.cos((right.lat * Math.PI) / 180) *
      Math.sin(lngDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export { getCuisineIcon, getCuisineIcons } from "../utils/cuisine-icon";

// Custom modern gastronomic marker: circular dome + sleek needle tip + top centered rating badge
function createRestaurantIcon(
  restaurant: RestaurantCandidate,
  isSelected: boolean,
  isHovered: boolean = false,
  showRating: boolean = false,
) {
  const isFeatured = Boolean(restaurant.isFeatured);

  // Palette: Gold (Featured) / Forest Green (100% Vegan) / Amber (Vegetarian) / Metallic Slate (Veg-friendly)
  const pinColor = isFeatured
    ? "#ca8a04" // Gold for Top Picks
    : restaurant.isVegan
      ? "#047857" // Forest emerald for 100% Vegan
      : restaurant.isVegetarian
        ? "#d97706" // Amber for Vegetarian
        : "#64748b"; // Metallic slate for Veg-friendly

  const strokeColor = isSelected ? "#fef08a" : isHovered ? "#ffffff" : "#ffffff";
  const icon = getCuisineIcon(restaurant);

  const hasRating =
    typeof restaurant.rating === "number" &&
    Number.isFinite(restaurant.rating) &&
    restaurant.rating > 0;
  const ratingLabel = isFeatured
    ? `${restaurant.rating?.toFixed(1) || "5.0"}`
    : (hasRating ? restaurant.rating!.toFixed(1) : "");

  // Render exactly one prominent cuisine emoji
  const emojisHtml = `<span class="pin-cuisine-emoji single">${icon}</span>`;

  // Rating pill centered horizontally directly above the dome, displayed only with high zoom (zoom >= 16)
  const ratingPillHtml = (showRating && (hasRating || isFeatured))
    ? `<div class="vegan-map-pin-rating" style="color: ${pinColor}; border-color: ${pinColor};">
         ★ ${ratingLabel}
       </div>`
    : "";

  const html = `
    <div class="vegan-map-pin-wrapper ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""}">
      <div class="vegan-map-pin-body" style="background-color: ${pinColor}; border-color: ${strokeColor};">
        <div class="vegan-map-pin-disc">
          ${emojisHtml}
        </div>
      </div>
      <div class="vegan-map-pin-needle" style="border-top-color: ${pinColor};"></div>
      ${ratingPillHtml}
    </div>
  `;

  // Width: 38px, Height: 41px (dome 36px + needle 6px - 1px overlap = 41px)
  const width = 38;
  const height = 41;

  return L.divIcon({
    html,
    className: "vegan-map-pin-leaflet-icon",
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
}

// Custom modern circular cluster badge with count
function createClusterIcon(count: number, hasSelected: boolean, hasFeatured: boolean = false) {
  const size = count < 10 ? 46 : count < 50 ? 54 : 62;
  const bgColor = hasSelected ? "#064e3b" : hasFeatured ? "#065f46" : "#047857";
  const borderColor = hasSelected ? "#a7f3d0" : hasFeatured ? "#facc15" : "#d9f99d";
  const borderWidth = hasSelected ? 3.5 : hasFeatured ? 3.5 : 3;

  const html = `
    <div class="vegan-tools-map-cluster ${hasSelected ? "selected" : ""} ${hasFeatured ? "has-featured" : ""}" style="position: relative; width: ${size}px; height: ${size}px; line-height: ${size}px; font-size: ${size >= 54 ? "1.1rem" : "0.95rem"}; background: ${bgColor}; border: ${borderWidth}px solid ${borderColor};">
      <span>${count}</span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "vegan-tools-map-cluster-container",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createUserLocationIcon() {
  const svgHtml = `
    <div style="position: relative; width: 24px; height: 24px; margin: 0; padding: 0;">
      <div style="position: absolute; inset: 0; background: rgba(30, 144, 255, 0.28); border-radius: 50%; animation: pulse-ring 2s infinite;"></div>
      <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #1e90ff; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "user-location-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/**
 * Basemap: OpenFreeMap vector tiles (free, no API key, no usage limits), rendered through
 * MapLibre GL inside Leaflet so pins, clustering and popups keep working unchanged.
 * Positron is used for light mode because it has no POI icons competing with our pins.
 */
const OPENFREEMAP_STYLE_URLS = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const OPENFREEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** Last-resort raster fallback, only for devices without WebGL (light, policy-compliant usage). */
const OSM_RASTER_FALLBACK = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
};

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

type MaplibreBasemapLayer = L.Layer & { getMaplibreMap(): { setStyle(style: string): unknown } };

export function RestaurantMap({
  restaurants,
  selectedRestaurant,
  hoveredRestaurantId,
  mapCenterTarget,
  onSelectRestaurant,
  onOpenMenu,
  onSearchArea,
  onUserCoordsChange,
  onMapClick,
}: {
  restaurants: RestaurantCandidate[];
  selectedRestaurant?: RestaurantCandidate;
  hoveredRestaurantId?: string;
  mapCenterTarget?: { lat: number; lng: number; zoom?: number } | null;
  onSelectRestaurant: (restaurant: RestaurantCandidate) => void;
  onOpenMenu: (restaurant: RestaurantCandidate) => void;
  onSearchArea?: (
    center: { lat: number; lng: number },
    radius: number,
    bbox?: [number, number, number, number],
  ) => void;
  onUserCoordsChange?: (coords: { lat: number; lng: number }, isRealGps?: boolean) => void;
  onMapClick?: () => void;
}) {
  const language = useLanguage();
  const { effectiveTheme } = useTheme();
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const basemapLayerRef = useRef<MaplibreBasemapLayer | null>(null);
  const effectiveThemeRef = useRef(effectiveTheme);
  effectiveThemeRef.current = effectiveTheme;
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>();
  const [isLocating, setIsLocating] = useState(false);
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);

  // Markers drawn by the last full render, so hovering a result only updates
  // the two markers involved instead of rebuilding every pin and label.
  const singleMarkersRef = useRef(new Map<string, { marker: L.Marker; restaurant: RestaurantCandidate }>());
  const clusterMarkersRef = useRef(
    new Map<string, { marker: L.Marker; count: number; hasSelected: boolean; hasFeatured: boolean }>(),
  );
  const hoveredIdRef = useRef(hoveredRestaurantId);
  const appliedHoverRef = useRef<string | undefined>(undefined);

  const bindNameTooltip = (marker: L.Marker, restaurant: RestaurantCandidate, isSelected: boolean) => {
    if (marker.getTooltip()) return;
    marker.bindTooltip(restaurant.name, {
      permanent: true,
      direction: "bottom",
      offset: [0, 4],
      className: isSelected ? "map-pin-name-tooltip selected" : "map-pin-name-tooltip",
    });
  };

  const renderClustersAndMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    singleMarkersRef.current.clear();
    clusterMarkersRef.current.clear();
    appliedHoverRef.current = undefined;

    const zoom = map.getZoom();
    const clusterRadius = zoom >= 14 ? 0 : zoom >= 13 ? 16 : zoom >= 12 ? 24 : 34;
    const showPinRating = zoom >= 16;
    // Name labels are only visible from zoom 17 (CSS) or on hover: creating a
    // permanent tooltip for every pin at lower zooms was wasted DOM work.
    const showLabels = zoom >= 17;
    const hoveredId = hoveredIdRef.current;

    // Use the restaurants provided by the parent component
    const validRestaurants = restaurants.filter(
      (r) =>
        r.placeType !== "city" &&
        typeof r.latitude === "number" &&
        typeof r.longitude === "number" &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude) &&
        !(r.latitude === 0 && r.longitude === 0)
    );

    const clusterResults =
      clusterRadius > 0
        ? clusterPoints(
            validRestaurants,
            (lat, lng) => map.project([lat, lng], zoom),
            clusterRadius
          )
        : validRestaurants.map((item) => ({
            type: "single" as const,
            item,
            latitude: item.latitude,
            longitude: item.longitude,
          }));

    for (const result of clusterResults) {
      if (result.type === "single") {
        const restaurant = result.item;
        const isSelected = selectedRestaurant?.id === restaurant.id;
        const isHovered = hoveredId === restaurant.id;
        const marker = L.marker([restaurant.latitude, restaurant.longitude], {
          icon: createRestaurantIcon(restaurant, isSelected, isHovered, showPinRating),
          zIndexOffset: isSelected ? 1000 : isHovered ? 900 : 0,
        });

        if (showLabels || isSelected || isHovered) {
          bindNameTooltip(marker, restaurant, isSelected);
        }

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRestaurant(restaurant);
        });

        marker.on("mouseover", () => {
          bindNameTooltip(marker, restaurant, isSelected);
          marker.getTooltip()?.getElement()?.classList.add("hovered");
        });

        marker.on("mouseout", () => {
          marker.getTooltip()?.getElement()?.classList.remove("hovered");
        });

        markersGroup.addLayer(marker);
        singleMarkersRef.current.set(restaurant.id, { marker, restaurant });
        if (isHovered) appliedHoverRef.current = restaurant.id;
      } else {
        const hasSelected = selectedRestaurant
          ? result.items.some((r) => r.id === selectedRestaurant.id)
          : false;
        const hasHovered = hoveredId
          ? result.items.some((r) => r.id === hoveredId)
          : false;
        const hasFeatured = Boolean(result.hasFeatured);

        const clusterMarker = L.marker([result.latitude, result.longitude], {
          icon: createClusterIcon(result.count, hasSelected || hasHovered, hasFeatured),
          zIndexOffset: hasSelected ? 800 : hasHovered ? 700 : 100,
        });

        clusterMarker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          const bounds = L.latLngBounds(
            [result.bounds.minLat, result.bounds.minLng],
            [result.bounds.maxLat, result.bounds.maxLng]
          );
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
        });

        markersGroup.addLayer(clusterMarker);
        const clusterEntry = { marker: clusterMarker, count: result.count, hasSelected, hasFeatured };
        for (const item of result.items) clusterMarkersRef.current.set(item.id, clusterEntry);
        if (hasHovered) appliedHoverRef.current = hoveredId;
      }
    }
  }, [restaurants, selectedRestaurant, onSelectRestaurant]);

  // Hover: restyle only the previously and newly hovered pins (or their clusters).
  useEffect(() => {
    hoveredIdRef.current = hoveredRestaurantId;
    const map = mapInstanceRef.current;
    if (!map) return;
    const showPinRating = map.getZoom() >= 16;

    const apply = (id: string | undefined, hovered: boolean) => {
      if (!id) return;
      const single = singleMarkersRef.current.get(id);
      if (single) {
        const isSelected = selectedRestaurant?.id === id;
        single.marker.setIcon(createRestaurantIcon(single.restaurant, isSelected, hovered, showPinRating));
        single.marker.setZIndexOffset(isSelected ? 1000 : hovered ? 900 : 0);
        if (hovered) bindNameTooltip(single.marker, single.restaurant, isSelected);
        single.marker.getTooltip()?.getElement()?.classList.toggle("hovered", hovered);
        return;
      }
      const cluster = clusterMarkersRef.current.get(id);
      if (cluster) {
        cluster.marker.setIcon(createClusterIcon(cluster.count, cluster.hasSelected || hovered, cluster.hasFeatured));
        cluster.marker.setZIndexOffset(cluster.hasSelected ? 800 : hovered ? 700 : 100);
      }
    };

    if (appliedHoverRef.current !== hoveredRestaurantId) {
      apply(appliedHoverRef.current, false);
      apply(hoveredRestaurantId, true);
      appliedHoverRef.current = hoveredRestaurantId;
    }
  }, [hoveredRestaurantId, selectedRestaurant]);

  const renderClustersRef = useRef(renderClustersAndMarkers);
  const onSearchAreaRef = useRef(onSearchArea);
  useEffect(() => {
    renderClustersRef.current = renderClustersAndMarkers;
    onSearchAreaRef.current = onSearchArea;
  }, [renderClustersAndMarkers, onSearchArea]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = selectedRestaurant?.latitude || 41.3879;
    const initialLng = selectedRestaurant?.longitude || 2.1699;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: selectedRestaurant ? 16 : 14,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    });

    // Basemap: OpenFreeMap vector styles via MapLibre GL (loaded lazily so the ~800 kB
    // renderer never lands in the main bundle). Raster OSM only when WebGL is unavailable.
    let basemapCancelled = false;
    const containerEl = mapContainerRef.current;
    const addRasterFallback = (reason: string) => {
      if (basemapCancelled) return;
      console.warn(`[RestaurantMap] ${reason}. Falling back to raster OpenStreetMap tiles.`);
      containerEl.classList.add("map-tiles-osm");
      L.tileLayer(OSM_RASTER_FALLBACK.url, {
        attribution: OSM_RASTER_FALLBACK.attribution,
        subdomains: "abc",
        maxNativeZoom: 19,
        maxZoom: 20,
      }).addTo(map);
    };

    if (supportsWebGL()) {
      Promise.all([
        import("maplibre-gl"),
        import("@maplibre/maplibre-gl-leaflet"),
        // MapLibre resolves its worker next to its own chunk by default, which Vite doesn't emit;
        // point it at the hashed asset explicitly (works in dev and production).
        import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
        import("maplibre-gl/dist/maplibre-gl.css"),
      ])
        .then(([maplibre, bridge, worker]) => {
          if (basemapCancelled) return;
          maplibre.setWorkerUrl(worker.default);
          const layer = bridge.maplibreGL({
            style: OPENFREEMAP_STYLE_URLS[effectiveThemeRef.current],
            // Shown immediately via Leaflet's attribution control (the bridge reads customAttribution).
            attributionControl: { customAttribution: OPENFREEMAP_ATTRIBUTION },
          }) as unknown as MaplibreBasemapLayer;
          layer.addTo(map); // goes into Leaflet's tilePane, below markers and popups
          basemapLayerRef.current = layer;
        })
        .catch((error: unknown) => {
          addRasterFallback(`Vector basemap failed to load (${String(error)})`);
        });
    } else {
      addRasterFallback("WebGL is not available");
    }

    // Ensure map container calculates correct dimensions immediately after rendering
    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    const updateZoomClass = () => {
      if (!mapContainerRef.current) return;
      if (map.getZoom() >= 15) {
        mapContainerRef.current.classList.add("leaflet-map-zoom-close");
      } else {
        mapContainerRef.current.classList.remove("leaflet-map-zoom-close");
      }
      if (map.getZoom() >= 17) {
        mapContainerRef.current.classList.add("leaflet-map-labels-visible");
      } else {
        mapContainerRef.current.classList.remove("leaflet-map-labels-visible");
      }
    };
    map.on("zoomend", updateZoomClass);
    map.on("zoomend", () => renderClustersRef.current());
    updateZoomClass();

    // Detect user tap/click on the empty map canvas to collapse bottom sheet
    map.on("click", () => {
      onMapClickRef.current?.();
    });

    // Detect user pan/drag to show "Search this area" button
    map.on("dragend", () => {
      if (onSearchAreaRef.current) {
        setShowSearchAreaBtn(true);
      }
    });

    // Invalidate size on window resize or load
    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      basemapCancelled = true;
      basemapLayerRef.current = null;
      resizeObserver?.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch the vector style when the theme changes
  useEffect(() => {
    basemapLayerRef.current?.getMaplibreMap().setStyle(OPENFREEMAP_STYLE_URLS[effectiveTheme]);
  }, [effectiveTheme]);

  const initialLocatedRef = useRef(false);

  // On mount, try requesting GPS location once with silent fallback to IP location
  useEffect(() => {
    if (initialLocatedRef.current) return;
    initialLocatedRef.current = true;
    let cancelled = false;

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled || !mapInstanceRef.current) return;
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });
          onUserCoordsChange?.({ lat: latitude, lng: longitude });

          const map = mapInstanceRef.current;
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            userMarkerRef.current = L.marker([latitude, longitude], {
              icon: createUserLocationIcon(),
              zIndexOffset: 500,
            }).addTo(map);
          }
          map.setView([latitude, longitude], 15);
        },
        () => {
          // If permission is dismissed or denied, use approximate IP location smoothly
          void getApproximateLocation()
            .then((loc) => {
              if (cancelled || !loc || !mapInstanceRef.current) return;
              mapInstanceRef.current.setView([loc.latitude, loc.longitude], 14);
            })
            .catch(() => {});
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
      );
    } else {
      void getApproximateLocation()
        .then((loc) => {
          if (cancelled || !loc || !mapInstanceRef.current) return;
          mapInstanceRef.current.setView([loc.latitude, loc.longitude], 14);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [onUserCoordsChange]);

  const lastSelectedRestaurantIdRef = useRef<string | undefined>(undefined);

  // Update Markers when renderClustersAndMarkers changes
  useEffect(() => {
    renderClustersAndMarkers();
  }, [renderClustersAndMarkers]);

  // If selectedRestaurant changes to a new venue, center and fly smoothly to it
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRestaurant) return;

    if (selectedRestaurant.id !== lastSelectedRestaurantIdRef.current) {
      lastSelectedRestaurantIdRef.current = selectedRestaurant.id;
      if (
        typeof selectedRestaurant.latitude === "number" &&
        typeof selectedRestaurant.longitude === "number" &&
        Number.isFinite(selectedRestaurant.latitude) &&
        Number.isFinite(selectedRestaurant.longitude) &&
        !(selectedRestaurant.latitude === 0 && selectedRestaurant.longitude === 0)
      ) {
        map.flyTo([selectedRestaurant.latitude, selectedRestaurant.longitude], 16, {
          duration: 0.8,
        });
      }
    }
  }, [selectedRestaurant]);

  // If mapCenterTarget changes (e.g. user selected a city or area), immediately fly the map there
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapCenterTarget) return;
    map.flyTo([mapCenterTarget.lat, mapCenterTarget.lng], mapCenterTarget.zoom ?? 14, {
      duration: 0.8,
    });
  }, [mapCenterTarget]);

  // Handle user geolocation strictly on demand
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        onUserCoordsChange?.({ lat: latitude, lng: longitude }, true);

        const map = mapInstanceRef.current;
        if (!map) return;

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          userMarkerRef.current = L.marker([latitude, longitude], {
            icon: createUserLocationIcon(),
            zIndexOffset: 500,
          }).addTo(map);
        }

        map.flyTo([latitude, longitude], 15, { duration: 1.0 });
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const validPoints: [number, number][] = restaurants
      .filter((r) => r.latitude && r.longitude && !(r.latitude === 0 && r.longitude === 0))
      .map((r) => [r.latitude, r.longitude]);

    if (userCoords) {
      validPoints.push([userCoords.lat, userCoords.lng]);
    }

    if (validPoints.length > 0) {
      map.fitBounds(L.latLngBounds(validPoints), { padding: [40, 40], maxZoom: 16 });
    }
  };

  return (
    <div className="restaurant-map-container" aria-label={tx("Explore map")}>
      <div ref={mapContainerRef} className="leaflet-map-canvas" />

      {/* Floating Search this area button */}
      {showSearchAreaBtn && onSearchArea && (
        <div className="map-search-area-wrapper">
          <button
            type="button"
            className="map-search-area-btn"
            onClick={() => {
              const map = mapInstanceRef.current;
              if (!map) return;
              const center = map.getCenter();
              const bounds = map.getBounds();
              const radius = Math.max(
                500,
                Math.ceil(
                  Math.max(
                    distanceInMeters(center, bounds.getNorthEast()),
                    distanceInMeters(center, bounds.getSouthWest()),
                  ),
                ),
              );
              const bbox: [number, number, number, number] = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth(),
              ];
              setShowSearchAreaBtn(false);
              onSearchArea({ lat: center.lat, lng: center.lng }, radius, bbox);
            }}
          >
            <Search aria-hidden="true" />
            <span>{tx("Search this area")}</span>
          </button>
        </div>
      )}

      {/* Floating control tools on top of the map */}
      <div className="map-floating-controls">
        <button
          type="button"
          className={`map-tool-button ${isLocating ? "loading" : ""}`}
          onClick={handleLocateMe}
          title={tx("Locate me")}
          aria-label={tx("Locate me")}
          disabled={isLocating}
        >
          {isLocating ? <LoaderCircle size={18} className="spin" /> : <Crosshair size={18} />}
        </button>
        {restaurants.length > 1 && (
          <button
            type="button"
            className="map-tool-button"
            onClick={handleFitAll}
            title={tx("Recenter map")}
            aria-label={tx("Recenter map")}
          >
            <Maximize2 />
          </button>
        )}
      </div>
    </div>
  );
}
