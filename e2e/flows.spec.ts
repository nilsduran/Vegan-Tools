import { expect, mockJson, test } from "./support/app";

/**
 * The core flows that must not break: finding a restaurant and reading what
 * can be ordered, and logging a visit in the diary. The API is mocked; the
 * diary uses the local test login that only exists on localhost.
 */

const restaurant = {
  id: "e2e-green-bowl",
  name: "E2E Green Bowl",
  address: "Carrer de Prova 1, Barcelona",
  latitude: 41.3879,
  longitude: 2.1699,
  mapUrl: "https://www.openstreetmap.org/?mlat=41.3879&mlon=2.1699",
  provider: "openstreetmap",
  isVegan: true,
  placeType: "restaurant",
};

const menu = {
  id: "menu-e2e-green-bowl",
  editToken: "token",
  status: "ready",
  restaurantName: "E2E Green Bowl",
  sourceLabel: "Website",
  sourceUrl: "https://green-bowl.example/carta",
  sourceFiles: [],
  sourceCapturedAt: new Date().toISOString(),
  originalLanguage: "ca",
  sections: [
    {
      id: "s1",
      name: "Plats",
      items: [
        { id: "d1", originalName: "Bol de quinoa i cigrons", name: "Bol de quinoa i cigrons", verdict: "vegan", reason: "" },
        { id: "d2", originalName: "Amanida amb formatge", name: "Amanida amb formatge", verdict: "vegetarian", reason: "" },
      ],
    },
  ],
  createdAt: new Date().toISOString(),
  originalDeleteAt: new Date().toISOString(),
};

test("search a restaurant on the map and read its menu", async ({ page }) => {
  await mockJson(page, /\/v1\/restaurants\/search\?/, [restaurant]);
  await mockJson(page, new RegExp(`/v1/restaurants/${restaurant.id}/menu$`), menu);

  await page.goto("/map");
  const search = page.getByRole("searchbox").or(page.getByPlaceholder(/Search for a restaurant/i)).first();
  await search.fill("Green Bowl");
  await search.press("Enter");

  const result = page.locator(".restaurant-results li", { hasText: restaurant.name });
  await expect(result).toBeVisible({ timeout: 15_000 });
  await result.getByRole("button", { name: "Menu" }).click();

  await expect(page.getByText("Bol de quinoa i cigrons")).toBeVisible({ timeout: 15_000 });
});

test("log a visit in the diary and see it on the profile", async ({ page }) => {
  await page.goto("/restaurant/asante-bcn");
  await expect(page.locator("h1").first()).toContainText("Asante", { timeout: 15_000 });

  await page.getByRole("button", { name: "Log a visit" }).click();
  // Not signed in: the local test login (localhost only) stands in for an account.
  await page.getByRole("button", { name: /Log in as\s*tester_local/ }).click();

  const rating = page.getByRole("slider", { name: "Rating", exact: true });
  await rating.focus();
  await rating.press("ArrowRight");
  await rating.press("ArrowRight");
  await page.getByRole("button", { name: /Save visit & review/ }).click();

  await page.goto("/profile");
  await expect(page.getByText("Asante").first()).toBeVisible({ timeout: 15_000 });
});
