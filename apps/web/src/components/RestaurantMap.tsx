/**
 * @file RestaurantMap.tsx
 * @description Interactive Leaflet map for discovering vegan & vegan-friendly dining options.
 * Handles marker clustering, user geolocation tracking, viewport boundary queries,
 * cuisine-specific icon badges, and selection events.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, LoaderCircle, Maximize2, Search } from "lucide-react";
import { FEATURED_RESTAURANTS_BARCELONA, type RestaurantCandidate } from "@vegan-tools/domain";
import { getApproximateLocation } from "../api";
import { clusterPoints } from "../utils/cluster";
import { tx, useLanguage } from "../i18n";

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

export function getCuisineIcons(restaurant: RestaurantCandidate): string[] {
  const name = (restaurant.name || "").toLowerCase();
  const tags = (restaurant.tags ?? []).map((t) => t.toLowerCase());
  const cuisine = (restaurant.cuisine ?? "").toLowerCase();
  const notes = ("notes" in restaurant && typeof (restaurant as Record<string, unknown>).notes === "string"
    ? (restaurant as Record<string, unknown>).notes as string
    : "").toLowerCase();
  const text = `${name} ${tags.join(" ")} ${cuisine} ${notes}`;

  const icons: string[] = [];
  const add = (emoji: string) => {
    if (!icons.includes(emoji) && icons.length < 2) {
      icons.push(emoji);
    }
  };

  // 1. Specific cuisines & prominent categories
  if (
    name.includes("gallo santo") ||
    text.includes("taco") ||
    text.includes("mexic") ||
    text.includes("burrito") ||
    text.includes("quesadilla") ||
    text.includes("guacamole")
  ) {
    add("🌮");
  }
  if (
    name.includes("blu bar") ||
    text.includes("pizza") ||
    text.includes("pizzeria") ||
    text.includes("focaccia") ||
    text.includes("calzone")
  ) {
    add("🍕");
  }
  if (
    name.includes("vrutal") ||
    name.includes("mad mad") ||
    name.includes("quinoa") ||
    name.includes("junk food") ||
    text.includes("burger") ||
    text.includes("hamburg") ||
    text.includes("fries") ||
    text.includes("patates")
  ) {
    add("🍔");
  }
  if (
    name.includes("roots & rolls") ||
    name.includes("desoriente") ||
    text.includes("sushi") ||
    text.includes("maki") ||
    text.includes("nigiri") ||
    text.includes("japan") ||
    text.includes("japones")
  ) {
    add("🍣");
  }
  if (
    text.includes("ramen") ||
    text.includes("noodle") ||
    text.includes("thai") ||
    text.includes("viet") ||
    text.includes("pho") ||
    text.includes("pad thai") ||
    text.includes("wok") ||
    text.includes("asian") ||
    text.includes("asiat")
  ) {
    add("🍜");
  }
  if (
    name.includes("good shit") ||
    text.includes("falafel") ||
    text.includes("kebab") ||
    text.includes("shawarma") ||
    text.includes("hummus") ||
    text.includes("pita") ||
    text.includes("doner") ||
    text.includes("döner") ||
    text.includes("orient") ||
    text.includes("lebanese") ||
    text.includes("libanes")
  ) {
    add("🥙");
  }
  if (
    name.includes("besneta") ||
    name.includes("hanai") ||
    text.includes("bakery") ||
    text.includes("pastiss") ||
    text.includes("pasteler") ||
    text.includes("croissant") ||
    text.includes("cake") ||
    text.includes("pastry") ||
    text.includes("dolç") ||
    text.includes("pastissos") ||
    text.includes("forn") ||
    text.includes("boulangerie")
  ) {
    add("🥐");
  }
  if (
    text.includes("ice_cream") ||
    text.includes("gelat") ||
    text.includes("helad") ||
    text.includes("gelateria")
  ) {
    add("🍦");
  }
  if (
    name.includes("asante") ||
    text.includes("brunch") ||
    text.includes("breakfast") ||
    text.includes("esmorzar") ||
    text.includes("cafe") ||
    text.includes("cafeter") ||
    text.includes("coffee") ||
    text.includes("matcha") ||
    text.includes("chai")
  ) {
    add("☕");
  }
  if (
    name.includes("bubita") ||
    text.includes("paella") ||
    text.includes("arros") ||
    text.includes("arroz") ||
    text.includes("rice")
  ) {
    add("🥘");
  }
  if (
    text.includes("curry") ||
    text.includes("india") ||
    text.includes("masala") ||
    text.includes("tandoori") ||
    text.includes("nepal")
  ) {
    add("🍛");
  }
  if (
    name.includes("perra verde") ||
    name.includes("cactuscat") ||
    text.includes("tapas") ||
    text.includes("tapa") ||
    text.includes("pinchos") ||
    text.includes("bistrot") ||
    text.includes("mediterranean") ||
    text.includes("mediterran") ||
    text.includes("spanish") ||
    text.includes("catalan")
  ) {
    add("🥗");
  }
  if (
    text.includes("pasta") ||
    text.includes("lasagn") ||
    text.includes("spaghetti") ||
    text.includes("ravioli") ||
    text.includes("gnocchi")
  ) {
    add("🍝");
  }
  if (
    name.includes("ale & hop") ||
    text.includes("beer") ||
    text.includes("cervesa") ||
    text.includes("cerveza") ||
    text.includes("brew") ||
    text.includes("craft beer") ||
    text.includes("pub")
  ) {
    add("🍺");
  }
  if (text.includes("cocktail") || text.includes("coctel") || text.includes("copas") || text.includes("bar")) {
    add("🍸");
  }
  if (
    text.includes("salad") ||
    text.includes("amanida") ||
    text.includes("ensalada") ||
    text.includes("bowl") ||
    text.includes("healthy") ||
    text.includes("raw") ||
    text.includes("organic") ||
    text.includes("macrobiotic")
  ) {
    add("🥗");
  }
  if (
    text.includes("dumpling") ||
    text.includes("gyoza") ||
    text.includes("dim sum") ||
    text.includes("chinese") ||
    text.includes("xines")
  ) {
    add("🥟");
  }

  // 2. Fallbacks if no specific cuisine matched
  if (icons.length === 0) {
    if (restaurant.isVegan) {
      icons.push("🌱");
    } else if (restaurant.isVegetarian) {
      icons.push("🌿");
    } else {
      icons.push("🍽️");
    }
  }

  return icons;
}

export function getCuisineIcon(restaurant: RestaurantCandidate): string {
  return getCuisineIcons(restaurant)[0] ?? "🍽️";
}

// Custom modern gastronomic marker: circular dome + needle tip + top-right star badge
function createRestaurantIcon(
  restaurant: RestaurantCandidate,
  isSelected: boolean,
  isHovered: boolean = false,
) {
  const isFeatured = Boolean(restaurant.isFeatured);

  // Palette: Gold (Featured) / Forest Green (100% Vegan) / Amber (Vegetarian) / Cobalt Blue (Vegan Options)
  const pinColor = isFeatured
    ? "#ca8a04" // Gold for Top Picks
    : restaurant.isVegan
      ? "#047857" // Forest emerald for 100% Vegan
      : restaurant.isVegetarian
        ? "#d97706" // Amber for Vegetarian
        : "#2563eb"; // Cobalt Blue for Vegan Options

  const strokeColor = isSelected ? "#fef08a" : isHovered ? "#ffffff" : "#ffffff";
  const icons = getCuisineIcons(restaurant);

  const hasRating =
    typeof restaurant.rating === "number" &&
    Number.isFinite(restaurant.rating) &&
    restaurant.rating > 0;
  const ratingLabel = isFeatured
    ? `${restaurant.rating?.toFixed(1) || "5.0"}`
    : (hasRating ? restaurant.rating!.toFixed(1) : "");

  // Render cuisine emojis using HTML to guarantee native OS emoji rendering
  const emojisHtml = icons.length === 1
    ? `<span class="pin-cuisine-emoji single">${icons[0]}</span>`
    : `<span class="pin-cuisine-emoji multi">${icons[0]}</span><span class="pin-cuisine-emoji multi second">${icons[1]}</span>`;

  // Rating pill placed at the top-right of the dome so it never covers the needle or label
  const ratingPillHtml = (hasRating || isFeatured)
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

  // Width: 38px, Height: 46px (dome 36px + needle 10px - 2px overlap = 44px + margins)
  const width = 38;
  const height = 46;

  return L.divIcon({
    html,
    className: "vegan-map-pin-leaflet-icon",
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
}

// Custom modern circular cluster badge with count
function createClusterIcon(count: number, hasSelected: boolean) {
  const size = count < 10 ? 46 : count < 50 ? 54 : 62;
  const bgColor = hasSelected ? "#064e3b" : "#047857";
  const borderColor = hasSelected ? "#a7f3d0" : "#d9f99d";
  const borderWidth = hasSelected ? 3.5 : 3;

  const html = `
    <div class="vegan-tools-map-cluster ${hasSelected ? "selected" : ""}" style="width: ${size}px; height: ${size}px; line-height: ${size}px; font-size: ${size >= 54 ? "1.1rem" : "0.95rem"}; background: ${bgColor}; border: ${borderWidth}px solid ${borderColor};">
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

export function RestaurantMap({
  restaurants,
  selectedRestaurant,
  hoveredRestaurantId,
  onSelectRestaurant,
  onOpenMenu,
  onSearchArea,
  onUserCoordsChange,
  onMapClick,
}: {
  restaurants: RestaurantCandidate[];
  selectedRestaurant?: RestaurantCandidate;
  hoveredRestaurantId?: string;
  onSelectRestaurant: (restaurant: RestaurantCandidate) => void;
  onOpenMenu: (restaurant: RestaurantCandidate) => void;
  onSearchArea?: (center: { lat: number; lng: number }, radius: number) => void;
  onUserCoordsChange?: (coords: { lat: number; lng: number }) => void;
  onMapClick?: () => void;
}) {
  const language = useLanguage();
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>();
  const [isLocating, setIsLocating] = useState(false);
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);

  const renderClustersAndMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const zoom = map.getZoom();
    const clusterRadius = zoom >= 14 ? 0 : zoom === 13 ? 14 : zoom === 12 ? 22 : 32;

    const existingIds = new Set(restaurants.map((r) => r.id));
    const combinedRestaurants = [
      ...restaurants,
      ...FEATURED_RESTAURANTS_BARCELONA.filter((f) => !existingIds.has(f.id)),
    ];

    const validRestaurants = combinedRestaurants.filter(
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
            (lat, lng) => map.latLngToLayerPoint([lat, lng]),
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
        const isHovered = hoveredRestaurantId === restaurant.id;
        const marker = L.marker([restaurant.latitude, restaurant.longitude], {
          icon: createRestaurantIcon(restaurant, isSelected, isHovered),
          zIndexOffset: isSelected ? 1000 : isHovered ? 900 : 0,
        });

        marker.bindTooltip(restaurant.name, {
          permanent: true,
          direction: "bottom",
          offset: [0, 4],
          className: isSelected
            ? "map-pin-name-tooltip selected"
            : isHovered
              ? "map-pin-name-tooltip hovered"
              : "map-pin-name-tooltip",
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectRestaurant(restaurant);
        });

        markersGroup.addLayer(marker);
      } else {
        const hasSelected = selectedRestaurant
          ? result.items.some((r) => r.id === selectedRestaurant.id)
          : false;
        const hasHovered = hoveredRestaurantId
          ? result.items.some((r) => r.id === hoveredRestaurantId)
          : false;

        const clusterMarker = L.marker([result.latitude, result.longitude], {
          icon: createClusterIcon(result.count, hasSelected || hasHovered),
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
      }
    }
  }, [restaurants, selectedRestaurant, hoveredRestaurantId, onSelectRestaurant]);

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
    });

    // Basemap: Use CARTO Voyager if an API key is provided, Geoapify if key provided, otherwise official OpenStreetMap standard tiles (watermark-free)
    const cartoKey = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();
    const geoapifyKey = (import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined)?.trim();

    let tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    let attribution =
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
    let subdomains: string | string[] = "abc";

    if (cartoKey) {
      tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`;
      attribution =
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';
      subdomains = "abcd";
    } else if (geoapifyKey) {
      tileUrl = `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${geoapifyKey}`;
      attribution =
        'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
      subdomains = "abcd";
    }

    L.tileLayer(tileUrl, {
      attribution,
      subdomains,
      maxNativeZoom: 19,
      maxZoom: 20,
    }).addTo(map);

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
    map.on("moveend", () => renderClustersRef.current());
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
      resizeObserver?.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

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

  // Update Markers when renderClustersAndMarkers changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    renderClustersAndMarkers();

    // If selectedRestaurant is provided, center and fly smoothly to it
    if (
      selectedRestaurant &&
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
  }, [renderClustersAndMarkers, selectedRestaurant]);

  // Handle user geolocation strictly on demand
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        onUserCoordsChange?.({ lat: latitude, lng: longitude });

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
              setShowSearchAreaBtn(false);
              onSearchArea({ lat: center.lat, lng: center.lng }, radius);
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
