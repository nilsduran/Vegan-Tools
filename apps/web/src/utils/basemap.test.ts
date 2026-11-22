// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { basemapChain } from "./basemap";

describe("basemapChain", () => {
  it("uses keyed rasters first, then OpenFreeMap, then OSM as last resort", () => {
    const ids = basemapChain({ cartoKey: "k1", geoapifyKey: "k2" }, true).map((s) => s.id);
    expect(ids).toEqual(["carto-voyager", "geoapify-osm-bright-smooth", "openfreemap", "openstreetmap"]);
  });

  it("leaves out keyed sources that have no key", () => {
    const ids = basemapChain({ geoapifyKey: "  " }, true).map((s) => s.id);
    expect(ids).toEqual(["openfreemap", "openstreetmap"]);
  });

  it("skips the vector source without WebGL", () => {
    const ids = basemapChain({ cartoKey: "k1" }, false).map((s) => s.id);
    expect(ids).toEqual(["carto-voyager", "openstreetmap"]);
  });

  it("uses the dark Voyager variant for dark mode and sends the key", () => {
    const carto = basemapChain({ cartoKey: "abc" }, true)[0];
    if (!carto || carto.kind !== "raster") throw new Error("expected a raster source");
    expect(carto.urlFor("dark")).toContain("/dark_all/");
    expect(carto.urlFor("light")).toContain("/voyager/");
    expect(carto.urlFor("light")).toContain("key=abc");
  });
});
