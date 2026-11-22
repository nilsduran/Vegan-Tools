import { expect, test } from "./support/app";

// Each main page must render its heading on desktop and mobile, even with the
// API unreachable.
const routes = ["/", "/scanner", "/resources", "/about"];

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

test("changes the language from the header without an account", async ({ page }) => {
  await page.goto("/");
  const switcher = page.getByRole("group", { name: "Language" });
  await expect(switcher).toBeVisible();

  await switcher.getByRole("button", { name: "Català" }).click();
  await expect(page.getByRole("group", { name: "Idioma" })).toBeVisible();

  // The choice survives a reload.
  await page.reload();
  await expect(page.getByRole("group", { name: "Idioma" })).toBeVisible();
});

test("opens settings from the profile without an account", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("button", { name: /English/ }).first()).toBeVisible();
});
