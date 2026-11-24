// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { NOT_A_MENU_ERROR, type MenuDraft, type UniversalScanResult } from "@vegan-tools/domain";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const analyzeScanUrl = vi.fn<(url: string, language: string) => Promise<UniversalScanResult>>();
const failedDraft = { status: "failed", sections: [], error: NOT_A_MENU_ERROR } as unknown as MenuDraft;
vi.mock("../api", () => ({
  discoverMenuByUrl: vi.fn(async () => failedDraft),
  waitForMenuDraft: vi.fn(async (draft: MenuDraft) => draft),
  analyzeScanUrl: (url: string, language: string) => analyzeScanUrl(url, language),
  getBrandEthics: vi.fn(),
}));

import { ScannedMenuPage } from "./ScannedMenuPage";

function renderPage(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/scan/menu?url=${encodeURIComponent(url)}`]}>
        <ScannedMenuPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const article: UniversalScanResult = {
  subject: "other",
  title: "How to write a restaurant menu",
  verdict: "unknown",
  reason: "An article about menus, not a product.",
  concerns: [],
  alternatives: [],
  findings: [],
  traces: [],
  assurance: "unverified",
  sources: [],
};

afterEach(() => {
  cleanup();
  analyzeScanUrl.mockReset();
});

describe("ScannedMenuPage", () => {
  it("checks the link as an ordinary one when it is not a menu", async () => {
    analyzeScanUrl.mockResolvedValue(article);
    renderPage("https://blog.example/how-to-write-a-carta");
    expect(await screen.findByText("How to write a restaurant menu")).toBeTruthy();
    expect(screen.queryByText(/does not look like a menu/i)).toBeNull();
  });

  it("says it is not a menu when the link check also points to a menu", async () => {
    analyzeScanUrl.mockResolvedValue({ ...article, subject: "menu", menuUrl: "https://blog.example/how-to-write-a-carta" });
    renderPage("https://blog.example/how-to-write-a-carta");
    expect(await screen.findByText("This link is not a restaurant menu.")).toBeTruthy();
  });
});
