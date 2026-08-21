import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Maximize2, MapPin, Search } from "lucide-react";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import { getApproximateLocation } from "../api";
import { tx, useLanguage } from "../i18n";

// Custom modern SVG marker for Vegan Tools restaurants
function createRestaurantIcon(isSelected: boolean) {
  const pinColor = isSelected ? "#064e3b" : "#0f5c45";
  const strokeColor = isSelected ? "#a7f3d0" : "#ffffff";
  const width = isSelected ? 36 : 28;
  const height = isSelected ? 46 : 36;

  const svgHtml = `
    <div style="width: ${width}px; height: ${height}px; margin: 0; padding: 0; display: block; line-height: 0;">
      <svg viewBox="0 0 24 30" width="${width}" height="${height}" fill="${pinColor}" stroke="${strokeColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.32));">
        <path d="M12 2C7.03 2 3 6.03 3 11c0 6.75 9 17 9 17s9-10.25 9-17c0-4.97-4.03-9-9-9z"/>
        <circle cx="12" cy="11" r="3.6" fill="#d9f99d" stroke="none"/>
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
  onSearchArea?: (center: { lat: number; lng: number }) => void;
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
    updateZoomClass();

    // Detect user pan/drag to show "Search this area" button
    map.on("dragend", () => {
      if (onSearchArea) {
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

  // Fetch approximate IP location on load if no specific restaurant was selected
  useEffect(() => {
    if (initialLocatedRef.current || selectedRestaurant) return;
    initialLocatedRef.current = true;
    let cancelled = false;
    void getApproximateLocation()
      .then((loc) => {
        if (cancelled || !loc || !mapInstanceRef.current) return;
        const map = mapInstanceRef.current;
        map.setView([loc.latitude, loc.longitude], 14);
      })
      .catch(() => {
        // Fallback silently if offline or IP lookup fails
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRestaurant]);

  // Update Markers when restaurants or selectedRestaurant changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const validRestaurants = restaurants.filter(
      (r) =>
        typeof r.latitude === "number" &&
        typeof r.longitude === "number" &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude) &&
        !(r.latitude === 0 && r.longitude === 0),
    );

    for (const restaurant of validRestaurants) {
      const isSelected = selectedRestaurant?.id === restaurant.id;
      const marker = L.marker([restaurant.latitude, restaurant.longitude], {
        icon: createRestaurantIcon(isSelected),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      // Bind persistent name tooltip displayed under the pin
      marker.bindTooltip(restaurant.name, {
        permanent: true,
        direction: "bottom",
        offset: [0, 4],
        className: isSelected ? "map-pin-name-tooltip selected" : "map-pin-name-tooltip",
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRestaurant(restaurant);
      });

      markersGroup.addLayer(marker);
    }

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
  }, [restaurants, selectedRestaurant, onSelectRestaurant]);

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
              setShowSearchAreaBtn(false);
              onSearchArea({ lat: center.lat, lng: center.lng });
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
