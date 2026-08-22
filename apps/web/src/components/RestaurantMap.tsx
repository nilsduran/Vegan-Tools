import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Maximize2, Search } from "lucide-react";
import type { RestaurantCandidate } from "@vegan-tools/domain";
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

// Custom modern SVG marker for Vegan Tools restaurants
function createRestaurantIcon(isSelected: boolean) {
  const pinColor = isSelected ? "#064e3b" : "#047857";
  const strokeColor = isSelected ? "#34d399" : "#ffffff";
  const strokeWidth = isSelected ? 2.4 : 1.8;
  const width = isSelected ? 42 : 34;
  const height = isSelected ? 54 : 44;
  const dotRadius = isSelected ? 5 : 4.2;
  const dotColor = isSelected ? "#bef264" : "#d9f99d";

  const svgHtml = `
    <div style="width: ${width}px; height: ${height}px; margin: 0; padding: 0; display: block; line-height: 0;">
      <svg viewBox="0 0 24 32" width="${width}" height="${height}" fill="${pinColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.36));">
        <path d="M12 2C7.03 2 3 6.03 3 11c0 7.2 9 19 9 19s9-11.8 9-19c0-4.97-4.03-9-9-9z"/>
        <circle cx="12" cy="11" r="${dotRadius}" fill="${dotColor}" stroke="none"/>
        <circle cx="12" cy="11" r="${dotRadius * 0.45}" fill="${isSelected ? "#064e3b" : "#065f46"}" stroke="none"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "vegan-tools-map-pin-container",
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
}

// Custom modern circular cluster badge with count
function createClusterIcon(count: number, hasSelected: boolean) {
  const size = count < 10 ? 38 : count < 50 ? 44 : 50;
  const bgColor = hasSelected ? "#064e3b" : "#047857";
  const borderColor = hasSelected ? "#a7f3d0" : "#d9f99d";
  const borderWidth = hasSelected ? 3 : 2.5;

  const html = `
    <div class="vegan-tools-map-cluster ${hasSelected ? "selected" : ""}" style="width: ${size}px; height: ${size}px; line-height: ${size}px; background: ${bgColor}; border: ${borderWidth}px solid ${borderColor};">
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
      <div style="position: absolute; inset: 0; background: rgba(30, 144, 255, 0.25); border-radius: 50%; animation: pulse-ring 2s infinite;"></div>
      <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #1e90ff; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "vegan-tools-user-location-pin",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function RestaurantMap({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  onOpenMenu,
  onSearchArea,
  onUserCoordsChange,
}: {
  restaurants: RestaurantCandidate[];
  selectedRestaurant?: RestaurantCandidate;
  onSelectRestaurant: (restaurant: RestaurantCandidate) => void;
  onOpenMenu: (restaurant: RestaurantCandidate) => void;
  onSearchArea?: (center: { lat: number; lng: number }, radius: number) => void;
  onUserCoordsChange?: (coords: { lat: number; lng: number }) => void;
}) {
  const language = useLanguage();
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
    // Progressive zoom-dependent clustering:
    // zoom >= 15: completely unclustered (0px radius) so every restaurant pin is visible
    // zoom === 14: minimal 18px radius (only overlaps in same building cluster)
    // zoom === 13: 28px radius
    // zoom < 13: 40px radius
    const clusterRadius = zoom >= 15 ? 0 : zoom === 14 ? 18 : zoom === 13 ? 28 : 40;

    const clusterResults =
      clusterRadius > 0
        ? clusterPoints(
            restaurants,
            (lat, lng) => map.latLngToLayerPoint([lat, lng]),
            clusterRadius
          )
        : restaurants
            .filter(
              (r) =>
                typeof r.latitude === "number" &&
                typeof r.longitude === "number" &&
                Number.isFinite(r.latitude) &&
                Number.isFinite(r.longitude) &&
                !(r.latitude === 0 && r.longitude === 0)
            )
            .map((item) => ({
              type: "single" as const,
              item,
              latitude: item.latitude,
              longitude: item.longitude,
            }));

    for (const result of clusterResults) {
      if (result.type === "single") {
        const restaurant = result.item;
        const isSelected = selectedRestaurant?.id === restaurant.id;
        const marker = L.marker([restaurant.latitude, restaurant.longitude], {
          icon: createRestaurantIcon(isSelected),
          zIndexOffset: isSelected ? 1000 : 0,
        });

        marker.bindTooltip(restaurant.name, {
          permanent: true,
          direction: "bottom",
          offset: [0, 2],
          className: isSelected ? "map-pin-name-tooltip selected" : "map-pin-name-tooltip",
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

        const clusterMarker = L.marker([result.latitude, result.longitude], {
          icon: createClusterIcon(result.count, hasSelected),
          zIndexOffset: hasSelected ? 800 : 100,
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
  }, [restaurants, selectedRestaurant, onSelectRestaurant]);

  // Keep the Leaflet instance stable while React updates the map data.
  // The callbacks are refreshed through refs so map events still see current state.
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

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
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
      if (map.getZoom() >= 14) {
        mapContainerRef.current.classList.add("leaflet-map-zoom-close");
      } else {
        mapContainerRef.current.classList.remove("leaflet-map-zoom-close");
      }
    };
    map.on("zoomend", updateZoomClass);
    map.on("zoomend", () => renderClustersRef.current());
    map.on("moveend", () => renderClustersRef.current());
    updateZoomClass();

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
    if (initialLocatedRef.current || selectedRestaurant) return;
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
  }, [selectedRestaurant, onUserCoordsChange]);

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
        >
          <Crosshair />
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
