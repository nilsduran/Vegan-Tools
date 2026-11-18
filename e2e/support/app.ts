import { test as base, expect, type Page } from "@playwright/test";

/**
 * Every test starts with the API unreachable (as during a Render cold start
 * or an outage) and mocks only what it needs. Uncaught page errors fail the
 * test: the app must stay usable when the API is down.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route(/\/v1\//, (route) => route.abort("connectionrefused"));
      await use(errors);
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function mockJson(page: Page, pattern: RegExp, body: unknown, status = 200): Promise<void> {
  await page.route(pattern, (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}
