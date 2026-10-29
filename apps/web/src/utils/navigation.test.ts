import { describe, expect, it } from "vitest";
import { getDirectionsUrl } from "./navigation";
import type { RestaurantCandidate } from "@vegan-tools/domain";

describe("navigation utils", () => {
  const restaurant: RestaurantCandidate = {
    id: "vrutal-bcn",
    name: "Vrutal",
    address: "Carrer de la Diputació, 200, Eixample, 08011 Barcelona",
    latitude: 41.38569,
    longitude: 2.16102,
    mapUrl: "https://www.openstreetmap.org/?mlat=41.38569&mlon=2.16102#map=17/41.38569/2.16102",
    provider: "curated",
  };

  it("builds directions URL with complete address on desktop", () => {
    const url = getDirectionsUrl(restaurant);
    expect(url).toContain("https://www.google.com/maps/dir/?api=1&destination=");
    expect(url).toContain(encodeURIComponent("Vrutal, Carrer de la Diputació, 200, Eixample, 08011 Barcelona"));
  });

  it("falls back to Google search with complete address when coordinates are missing", () => {
    const noCoordsRestaurant: RestaurantCandidate = {
      id: "test-no-coords",
      name: "Mad Mad Vegan",
      address: "Carrer d'Aribau, 65, Eixample, 08008 Barcelona",
      latitude: 0,
      longitude: 0,
      mapUrl: "",
      provider: "curated",
    };
    const url = getDirectionsUrl(noCoordsRestaurant);
    expect(url).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(url).toContain(encodeURIComponent("Mad Mad Vegan, Carrer d'Aribau, 65, Eixample, 08008 Barcelona"));
  });
});
