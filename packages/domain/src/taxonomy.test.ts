import { describe, it, expect } from "vitest";
import { lookupTaxonomy, getTaxonomySize } from "./taxonomy.js";

describe("Tier 2 Taxonomy Knowledge Graph", () => {
  it("carrega milers de termes indexats", () => {
    const size = getTaxonomySize();
    expect(size.entities).toBeGreaterThan(1000);
    expect(size.aliases).toBeGreaterThan(15000);
    expect(size.totalKeys).toBeGreaterThan(20000);
  });

  it("identifica additius per codi E normalitzat", () => {
    const e471 = lookupTaxonomy("emulgent (E-471)");
    expect(e471).not.toBeNull();
    expect(e471?.status).toBe("ambiguous");

    const e120 = lookupTaxonomy("colorant E120");
    expect(e120).not.toBeNull();
    expect(e120?.status).toBe("non_vegetarian");

    const e300 = lookupTaxonomy("E-300");
    expect(e300).not.toBeNull();
    expect(e300?.status).toBe("vegan");
  });

  it("identifica ingredients exactes multilingües", () => {
    const gelatin = lookupTaxonomy("gelatina de porc");
    expect(gelatin).not.toBeNull();
    expect(gelatin?.status).toBe("non_vegetarian");

    const agar = lookupTaxonomy("agar-agar");
    expect(agar).not.toBeNull();
    expect(agar?.status).toBe("vegan");
  });

  it("no confon falsos amics perquè no fa cerca per substring ingènua", () => {
    // Aquests termes compostos no deuen coincidir amb "mantega" o "llet"
    const mantegaCacau = lookupTaxonomy("mantega de cacau");
    // Com que no hi ha una entitat d'additiu E per mantega de cacau a la taxonomia bàsica d'additius, ha de retornar null per anar al Tier 3
    // i NO ha de retornar "vegetarian" per culpa de "mantega"!
    expect(mantegaCacau?.status).not.toBe("vegetarian");

    const lecheAlmendras = lookupTaxonomy("leche de almendras");
    expect(lecheAlmendras?.status).not.toBe("vegetarian");
  });
});
