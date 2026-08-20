import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Maximize2, MapPin, Search } from "lucide-react";
import type { RestaurantCandidate } from "@vegan-tools/domain";
import { tx, useLanguage } from "../i18n";

// Custom modern SVG marker for Vegan Tools restaurants
function createRestaurantIcon(isSelected: boolean) {
  const pinColor = isSelected ? "#09382b" : "#0f5c45";
  const scale = isSelected ? 1.25 : 1.0;
  const size = 36 * scale;

  const svgHtml = `
    <div style="position: relative; width: ${size}px; height: ${size}px; transform: translate(-50%, -100%); cursor: pointer;">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="3" fill="#ffffff" stroke="none"/>
      </svg>
      ${
        isSelected
          ? `<div style="position: absolute; bottom: -4px; left: 50%; width: 12px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; transform: translateX(-50%); filter: blur(1px);"></div>`
          : ""
      }
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "vegan-tools-map-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createUserLocationIcon() {
  const svgHtml = `
    <div style="position: relative; width: 22px; height: 22px; transform: translate(-50%, -50%);">
      <div style="position: absolute; width: 22px; height: 22px; background: rgba(30, 144, 255, 0.25); border-radius: 50%; animation: pulse-ring 2s infinite;"></div>
      <div style="position: absolute; top: 4px; left: 4px; width: 14px; height: 14px; background: #1e90ff; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "vegan-tools-user-location-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function RestaurantMap({
  restaurants,
  selectedRestaurant,
  onSelectRestaurant,
  onOpenMenu,
  onSearchArea,
}: {
  restaurants: RestaurantCandidate[];
  selectedRestaurant?: RestaurantCandidate;
  onSelectRestaurant: (restaurant: RestaurantCandidate) => void;
  onOpenMenu: (restaurant: RestaurantCandidate) => void;
  onSearchArea?: (center: { lat: number; lng: number }) => void;
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

    const initialLat = selectedRestaurant?.latitude || restaurants[0]?.latitude || 41.3879;
    const initialLng = selectedRestaurant?.longitude || restaurants[0]?.longitude || 2.1699;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: selectedRestaurant ? 16 : 14,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
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

      marker.on("click", () => {
        onSelectRestaurant(restaurant);
      });

      markersGroup.addLayer(marker);
    }

    // If selectedRestaurant is provided, center and fly to it
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
    } else if (validRestaurants.length > 0 && !selectedRestaurant) {
      const bounds = L.latLngBounds(
        validRestaurants.map((r) => [r.latitude, r.longitude]),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
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

      {/* Floating details card for currently selected restaurant (mobile & compact view) */}
      {selectedRestaurant && (
        <div className="map-selected-card" role="region" aria-label={selectedRestaurant.name}>
          <div className="map-selected-info">
            <div className="map-selected-title">
              <MapPin />
              <h3>{selectedRestaurant.name}</h3>
            </div>
            {selectedRestaurant.address && (
              <p className="map-selected-address">{selectedRestaurant.address}</p>
            )}
          </div>
          <div className="map-selected-actions">
            <button
              type="button"
              className="primary-button compact-btn"
              onClick={() => onOpenMenu(selectedRestaurant)}
            >
              {tx("Menu")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
