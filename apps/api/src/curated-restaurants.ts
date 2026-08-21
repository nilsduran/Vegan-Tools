import type { RestaurantCandidate } from "@vegan-tools/domain";

/**
 * Curated list of well-known vegan and vegan-friendly restaurants in Catalonia and worldwide hubs.
 * Provides instant zero-latency map markers and saves external API quota.
 */
export const CURATED_RESTAURANTS: RestaurantCandidate[] = [
  // --- CATALUNYA: BARCELONA ---
  {
    id: "curated-bcn-teresa-carles",
    name: "Teresa Carles",
    address: "Carrer de Jovellanos, 2, 08001 Barcelona",
    latitude: 41.3855,
    longitude: 2.1685,
    websiteUrl: "https://www.teresacarles.com",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Teresa+Carles+Barcelona",
    provider: "curated",
  },
  {
    id: "curated-bcn-roots-vegan",
    name: "Roots Vegan",
    address: "Carrer d'Aragó, 208, 08011 Barcelona",
    latitude: 41.3892,
    longitude: 2.1584,
    websiteUrl: "https://rootsvegan.com",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Roots+Vegan+Barcelona",
    provider: "curated",
  },
  {
    id: "curated-bcn-rasoterra",
    name: "Rasoterra Vegan Bistrot",
    address: "Carrer del Palau, 5, 08002 Barcelona",
    latitude: 41.3814,
    longitude: 2.1782,
    websiteUrl: "https://www.rasoterra.cat",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Rasoterra+Barcelona",
    provider: "curated",
  },
  {
    id: "curated-bcn-gallo-santo",
    name: "Gallo Santo",
    address: "Carrer del Torrent de l'Olla, 64, 08012 Barcelona",
    latitude: 41.4018,
    longitude: 2.1582,
    websiteUrl: "https://gallosanto.com",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Gallo+Santo+Gracia+Barcelona",
    provider: "curated",
  },
  {
    id: "curated-bcn-vegan-junk-food",
    name: "Vegan Junk Food Bar",
    address: "Carrer de Manresa, 4, 08003 Barcelona",
    latitude: 41.3842,
    longitude: 2.1805,
    websiteUrl: "https://www.veganjunkfoodbar.com",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Vegan+Junk+Food+Bar+Barcelona",
    provider: "curated",
  },
  {
    id: "curated-bcn-santoni",
    name: "Santoni Vegan Bakery & Cafe",
    address: "Ronda de Sant Antoni, 63, 08011 Barcelona",
    latitude: 41.3831,
    longitude: 2.1642,
    websiteUrl: "https://www.instagram.com/santonicafe",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Santoni+Vegan+Barcelona",
    provider: "curated",
  },
  {
    id: "curated-bcn-flax-and-kale",
    name: "Flax & Kale",
    address: "Carrer dels Tallers, 74b, 08001 Barcelona",
    latitude: 41.3858,
    longitude: 2.1656,
    websiteUrl: "https://flaxandkale.com",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Flax+and+Kale+Barcelona",
    provider: "curated",
  },

  // --- CATALUNYA: VIC & OSONA ---
  {
    id: "curated-vic-nyamera",
    name: "La Nyàmera",
    address: "Carrer de Sant Sadurní, 8, 08500 Vic",
    latitude: 41.9298,
    longitude: 2.2536,
    websiteUrl: "https://www.lanyamera.cat",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=La+Nyamera+Vic",
    provider: "curated",
  },
  {
    id: "curated-vic-el-taller",
    name: "El Taller - Espai Vegà",
    address: "Plaça Major, 12, 08500 Vic",
    latitude: 41.9304,
    longitude: 2.2547,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=El+Taller+Vic",
    provider: "curated",
  },

  // --- CATALUNYA: GIRONA ---
  {
    id: "curated-gir-bionectar",
    name: "Bionèctar Organic Living Food",
    address: "Carrer Francesc Ciurana, 22, 17001 Girona",
    latitude: 41.9796,
    longitude: 2.8182,
    websiteUrl: "https://www.bionectar.org",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Bionectar+Girona",
    provider: "curated",
  },
  {
    id: "curated-gir-integral",
    name: "Restaurant Vegetarià Integral",
    address: "Carrer de la Barca, 4, 17004 Girona",
    latitude: 41.9868,
    longitude: 2.8252,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Integral+Girona",
    provider: "curated",
  },

  // --- CATALUNYA: LLEIDA & TARRAGONA ---
  {
    id: "curated-tgn-el-vergel",
    name: "El Vergel Veggie Restaurant",
    address: "Carrer Major, 11, 43003 Tarragona",
    latitude: 41.1172,
    longitude: 1.2573,
    websiteUrl: "https://www.el-vergel.com",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=El+Vergel+Tarragona",
    provider: "curated",
  },
  {
    id: "curated-lleida-hortet",
    name: "L'Hortet",
    address: "Carrer Major, 45, 25007 Lleida",
    latitude: 41.6152,
    longitude: 0.6264,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=L+Hortet+Lleida",
    provider: "curated",
  },

  // --- CATALUNYA: MANRESA & VALLES ---
  {
    id: "curated-manresa-espai-organic",
    name: "Espai Orgànic",
    address: "Carrer del Born, 28, 08241 Manresa",
    latitude: 41.7245,
    longitude: 1.8268,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Espai+Organic+Manresa",
    provider: "curated",
  },

  // --- WORLD HUBS: LONDON ---
  {
    id: "curated-lon-purezza-camden",
    name: "Purezza Camden",
    address: "43 Parkway, London NW1 7PN",
    latitude: 51.5386,
    longitude: -0.1442,
    websiteUrl: "https://purezza.co.uk",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Purezza+Camden+London",
    provider: "curated",
  },
  {
    id: "curated-lon-mildreds-soho",
    name: "Mildreds Soho",
    address: "45 Lexington St, London W1F 9AN",
    latitude: 51.5134,
    longitude: -0.1378,
    websiteUrl: "https://www.mildreds.co.uk",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Mildreds+Soho+London",
    provider: "curated",
  },

  // --- WORLD HUBS: BERLIN ---
  {
    id: "curated-ber-brammibals",
    name: "Brammibal's Plant-Based Donuts",
    address: "Maybachufer 8, 12047 Berlin",
    latitude: 52.4939,
    longitude: 13.4244,
    websiteUrl: "https://www.brammibalsdonuts.com",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Brammibals+Berlin",
    provider: "curated",
  },

  // --- WORLD HUBS: PARIS ---
  {
    id: "curated-par-charlotte",
    name: "Le Potager de Charlotte",
    address: "12 Rue de la Tour d'Auvergne, 75009 Paris",
    latitude: 48.8789,
    longitude: 2.3456,
    websiteUrl: "https://www.lepotagerdecharlotte.fr",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Le+Potager+de+Charlotte+Paris",
    provider: "curated",
  },
];
