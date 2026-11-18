import { expect, test } from "./support/app";

// Each main page must render its heading on desktop and mobile, even with the
// API unreachable.
const routes = ["/", "/scanner", "/recipes", "/resources", "/about"];

for (const route of routes) {
  test(`renders ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
  });
}

test("renders the map", async ({ page }) => {
  await page.goto("/map");
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
});

test("shows the navigation that fits the screen", async ({ page, isMobile }) => {
  await page.goto("/");
  const bottomNav = page.locator(".mobile-bottom-nav, .bottom-nav").first();
  if (isMobile) await expect(bottomNav).toBeVisible();
  else await expect(bottomNav).toBeHidden();
});
