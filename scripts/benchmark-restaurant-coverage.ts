import { buildApp } from "../apps/api/src/app.js";
import { MemoryRepository } from "../apps/api/src/store.js";
import type { RestaurantCandidate } from "@vegan-tools/domain";

interface GroundTruthRestaurant {
  id: string;
  name: string;
  query: string;
  city: string;
  country: string;
  expectedLat: number;
  expectedLng: number;
  maxDistanceMeters: number;
}

// 75 real-world reference restaurants across Catalonia, UK, Europe, USA, Latin America and World.
// Curated ground truth with both popular and lesser-known local neighborhood venues to test unbiased discovery.
const BENCHMARK_DATASET: GroundTruthRestaurant[] = [
  // ========================================================
  // 1. CATALUNYA (25 RESTAURANTS: BCN BARRIS I COMARQUES)
  // ========================================================
  {
    id: "cat-bcn-desoriente",
    name: "Desoriente",
    query: "Desoriente Barcelona",
    city: "Barcelona (Poblenou)",
    country: "Catalunya",
    expectedLat: 41.4002,
    expectedLng: 2.2015,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-cactus-cat",
    name: "Cactus Cat Bar",
    query: "Cactus Cat Bar Barcelona",
    city: "Barcelona (Raval)",
    country: "Catalunya",
    expectedLat: 41.3837,
    expectedLng: 2.1662,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-vjfb",
    name: "Vegan Junk Food Bar",
    query: "Vegan Junk Food Bar Barcelona",
    city: "Barcelona (Born)",
    country: "Catalunya",
    expectedLat: 41.3842,
    expectedLng: 2.1805,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-gallo-santo",
    name: "Gallo Santo",
    query: "Gallo Santo Gracia",
    city: "Barcelona (Gràcia)",
    country: "Catalunya",
    expectedLat: 41.4018,
    expectedLng: 2.1582,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-green-spot",
    name: "The Green Spot",
    query: "The Green Spot Barcelona",
    city: "Barcelona (Port)",
    country: "Catalunya",
    expectedLat: 41.3822,
    expectedLng: 2.1834,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-roots-vegan",
    name: "Roots Vegan",
    query: "Roots Vegan Aragó",
    city: "Barcelona (Eixample)",
    country: "Catalunya",
    expectedLat: 41.3892,
    expectedLng: 2.1584,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-teresa-carles",
    name: "Teresa Carles",
    query: "Teresa Carles Jovellanos",
    city: "Barcelona (Ciutat Vella)",
    country: "Catalunya",
    expectedLat: 41.3855,
    expectedLng: 2.1685,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-santoni",
    name: "Santoni",
    query: "Santoni Cafe Barcelona",
    city: "Barcelona (Sant Antoni)",
    country: "Catalunya",
    expectedLat: 41.3831,
    expectedLng: 2.1642,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-flax-kale",
    name: "Flax & Kale",
    query: "Flax and Kale Tallers",
    city: "Barcelona (Raval)",
    country: "Catalunya",
    expectedLat: 41.3858,
    expectedLng: 2.1656,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-quinoa-bar",
    name: "Quinoa Bar",
    query: "Quinoa Travessera de Gracia",
    city: "Barcelona (Gràcia)",
    country: "Catalunya",
    expectedLat: 41.4019,
    expectedLng: 2.1588,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-blu-bar",
    name: "Blu Bar",
    query: "Blu Bar Rambla Poblenou",
    city: "Barcelona (Poblenou)",
    country: "Catalunya",
    expectedLat: 41.3998,
    expectedLng: 2.2023,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-mad-mad",
    name: "Mad Mad Vegan",
    query: "Mad Mad Vegan Balmes Barcelona",
    city: "Barcelona (Eixample)",
    country: "Catalunya",
    expectedLat: 41.3879,
    expectedLng: 2.1624,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-bubita",
    name: "Bubita Sangria Bar",
    query: "Bubita Sangria Bar Born",
    city: "Barcelona (Born)",
    country: "Catalunya",
    expectedLat: 41.3856,
    expectedLng: 2.1818,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-golosa",
    name: "La Golosa",
    query: "La Golosa Tamarit Barcelona",
    city: "Barcelona (Sant Antoni)",
    country: "Catalunya",
    expectedLat: 41.3789,
    expectedLng: 2.1601,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-besneta",
    name: "La Besneta",
    query: "La Besneta Torrijos",
    city: "Barcelona (Gràcia)",
    country: "Catalunya",
    expectedLat: 41.4034,
    expectedLng: 2.1589,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-vrutal",
    name: "Vrutal",
    query: "Vrutal Poblenou Barcelona",
    city: "Barcelona (Poblenou)",
    country: "Catalunya",
    expectedLat: 41.4001,
    expectedLng: 2.2052,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-honest-greens",
    name: "Honest Greens",
    query: "Honest Greens Rambla Catalunya",
    city: "Barcelona (Eixample)",
    country: "Catalunya",
    expectedLat: 41.3897,
    expectedLng: 2.1643,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-bcn-can-xurrades",
    name: "Can Xurrades",
    query: "Can Xurrades Casanova Barcelona",
    city: "Barcelona (Eixample)",
    country: "Catalunya",
    expectedLat: 41.3989,
    expectedLng: 2.1578,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-gir-greta",
    name: "Greta",
    query: "Greta Cort Reial Girona",
    city: "Girona",
    country: "Catalunya",
    expectedLat: 41.9863,
    expectedLng: 2.8252,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-gir-bionectar",
    name: "Bionèctar",
    query: "Bionectar Francesc Ciurana Girona",
    city: "Girona",
    country: "Catalunya",
    expectedLat: 41.9796,
    expectedLng: 2.8182,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-vic-nyamera",
    name: "La Nyàmera",
    query: "La Nyamera Sant Sadurni Vic",
    city: "Vic",
    country: "Catalunya",
    expectedLat: 41.9298,
    expectedLng: 2.2536,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-vic-el-taller",
    name: "El Taller - Espai Vegà",
    query: "El Taller Placa Major Vic",
    city: "Vic",
    country: "Catalunya",
    expectedLat: 41.9304,
    expectedLng: 2.2547,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-tgn-vergel",
    name: "El Vergel",
    query: "El Vergel Carrer Major Tarragona",
    city: "Tarragona",
    country: "Catalunya",
    expectedLat: 41.1172,
    expectedLng: 1.2573,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-salou-sama-sama",
    name: "Sama Sama",
    query: "Sama Sama Arago Salou",
    city: "Salou",
    country: "Catalunya",
    expectedLat: 41.0766,
    expectedLng: 1.1416,
    maxDistanceMeters: 800,
  },
  {
    id: "cat-lleida-hortet",
    name: "L'Hortet",
    query: "L'Hortet Carrer Major Lleida",
    city: "Lleida",
    country: "Catalunya",
    expectedLat: 41.6152,
    expectedLng: 0.6264,
    maxDistanceMeters: 800,
  },

  // ========================================================
  // 2. REGNE UNIT (12 RESTAURANTS DIVERSES CIUTATS)
  // ========================================================
  {
    id: "uk-lon-purezza",
    name: "Purezza Camden",
    query: "Purezza Parkway Camden London",
    city: "London",
    country: "UK",
    expectedLat: 51.5386,
    expectedLng: -0.1442,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-lon-mildreds",
    name: "Mildreds Soho",
    query: "Mildreds Lexington Soho London",
    city: "London",
    country: "UK",
    expectedLat: 51.5134,
    expectedLng: -0.1378,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-lon-unity-diner",
    name: "Unity Diner",
    query: "Unity Diner Spitalfields London",
    city: "London",
    country: "UK",
    expectedLat: 51.5173,
    expectedLng: -0.0735,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-lon-temple-seitan",
    name: "Temple of Seitan",
    query: "Temple of Seitan Morning Lane Hackney",
    city: "London",
    country: "UK",
    expectedLat: 51.5471,
    expectedLng: -0.0526,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-lon-gauthier",
    name: "Gauthier Soho",
    query: "Gauthier Romilly Street Soho",
    city: "London",
    country: "UK",
    expectedLat: 51.5139,
    expectedLng: -0.1315,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-bri-koocha",
    name: "Koocha Mezze Bar",
    query: "Koocha Mezze Bar Cheltenham Bristol",
    city: "Bristol",
    country: "UK",
    expectedLat: 51.4646,
    expectedLng: -2.5927,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-btn-purezza",
    name: "Purezza Brighton",
    query: "Purezza St James Brighton",
    city: "Brighton",
    country: "UK",
    expectedLat: 50.8217,
    expectedLng: -0.1332,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-man-wholesome",
    name: "Wholesome Junkies",
    query: "Wholesome Junkies Mirabel Manchester",
    city: "Manchester",
    country: "UK",
    expectedLat: 53.4851,
    expectedLng: -2.2384,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-gla-mono",
    name: "Mono",
    query: "Mono King Street Glasgow",
    city: "Glasgow",
    country: "UK",
    expectedLat: 55.8566,
    expectedLng: -4.2464,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-cdf-anna-loka",
    name: "Anna Loka",
    query: "Anna Loka Albany Road Cardiff",
    city: "Cardiff",
    country: "UK",
    expectedLat: 51.4938,
    expectedLng: -3.1672,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-lds-doner-summer",
    name: "Doner Summer",
    query: "Doner Summer Call Lane Leeds",
    city: "Leeds",
    country: "UK",
    expectedLat: 53.7946,
    expectedLng: -1.5414,
    maxDistanceMeters: 800,
  },
  {
    id: "uk-ncl-supernatural",
    name: "Super Natural Cafe",
    query: "Super Natural Cafe Grainger Newcastle",
    city: "Newcastle",
    country: "UK",
    expectedLat: 54.9712,
    expectedLng: -1.6163,
    maxDistanceMeters: 800,
  },

  // ========================================================
  // 3. RESTA D'EUROPA (25 RESTAURANTS DIVERSOS PAÏSOS)
  // ========================================================
  {
    id: "eu-mad-hakuna",
    name: "Hakuna Matata Veggie",
    query: "Hakuna Matata Galileo Madrid",
    city: "Madrid",
    country: "Spain",
    expectedLat: 40.4372,
    expectedLng: -3.7032,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-mad-madmad",
    name: "Mad Mad Vegan Chueca",
    query: "Mad Mad Vegan Pelayo Chueca Madrid",
    city: "Madrid",
    country: "Spain",
    expectedLat: 40.4225,
    expectedLng: -3.6987,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-mad-vega",
    name: "Vega Álamo",
    query: "Vega Alamo Calle Luna Madrid",
    city: "Madrid",
    country: "Spain",
    expectedLat: 40.4246,
    expectedLng: -3.7088,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-sev-tia-fula",
    name: "Veganitessen",
    query: "Veganitessen Pastor y Landero Sevilla",
    city: "Sevilla",
    country: "Spain",
    expectedLat: 37.3871,
    expectedLng: -5.9996,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-vlc-khambu",
    name: "Khambú",
    query: "Khambu Quart Valencia",
    city: "València",
    country: "Spain",
    expectedLat: 39.4756,
    expectedLng: -0.3831,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-bio-garibolo",
    name: "Garibolo",
    query: "Garibolo Fernandez del Campo Bilbao",
    city: "Bilbao",
    country: "Spain",
    expectedLat: 43.2592,
    expectedLng: -2.9348,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-par-charlotte",
    name: "Le Potager de Charlotte",
    query: "Le Potager de Charlotte Tour d'Auvergne Paris",
    city: "Paris",
    country: "France",
    expectedLat: 48.8789,
    expectedLng: 2.3456,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-par-hank",
    name: "Hank Burger Paris",
    query: "Hank Burger Archives Paris",
    city: "Paris",
    country: "France",
    expectedLat: 48.8606,
    expectedLng: 2.3582,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-par-aujourdhui",
    name: "Aujourd'hui Demain",
    query: "Aujourd'hui Demain Chemin Vert Paris",
    city: "Paris",
    country: "France",
    expectedLat: 48.8596,
    expectedLng: 2.3734,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-lyon-cul-poule",
    name: "Cul de Poule",
    query: "Cul de Poule rue de la Charite Lyon",
    city: "Lyon",
    country: "France",
    expectedLat: 45.7533,
    expectedLng: 4.8312,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-ber-brammibals",
    name: "Brammibal's Donuts",
    query: "Brammibal's Donuts Maybachufer Berlin",
    city: "Berlin",
    country: "Germany",
    expectedLat: 52.4939,
    expectedLng: 13.4244,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-ber-1990",
    name: "1990 Vegan Living",
    query: "1990 Vegan Living Krossener Berlin",
    city: "Berlin",
    country: "Germany",
    expectedLat: 52.5118,
    expectedLng: 13.4566,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-ber-kopps",
    name: "Kopps",
    query: "Kopps Linienstrasse Berlin",
    city: "Berlin",
    country: "Germany",
    expectedLat: 52.5298,
    expectedLng: 13.3986,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-ham-froindlichst",
    name: "Froindlichst",
    query: "Froindlichst Barmbeker Hamburg",
    city: "Hamburg",
    country: "Germany",
    expectedLat: 53.5854,
    expectedLng: 10.0152,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-rom-rifugio",
    name: "Rifugio Romano",
    query: "Rifugio Romano Volturno Rome",
    city: "Rome",
    country: "Italy",
    expectedLat: 41.9042,
    expectedLng: 12.4979,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-rom-ops",
    name: "Ops! Cucina",
    query: "Ops Cucina Bellinzona Roma",
    city: "Rome",
    country: "Italy",
    expectedLat: 41.9182,
    expectedLng: 12.5028,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-bol-botanica",
    name: "Botanica Lab",
    query: "Botanica Lab Battisti Bologna",
    city: "Bologna",
    country: "Italy",
    expectedLat: 44.4965,
    expectedLng: 11.3385,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-vie-tian",
    name: "TIAN Bistro",
    query: "TIAN Bistro Schrankgasse Vienna",
    city: "Vienna",
    country: "Austria",
    expectedLat: 48.2045,
    expectedLng: 16.3533,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-ams-meatless",
    name: "Meatless District",
    query: "Meatless District Bilderdijkstraat Amsterdam",
    city: "Amsterdam",
    country: "Netherlands",
    expectedLat: 52.3683,
    expectedLng: 4.8696,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-ams-vegan-junk",
    name: "Vegan Junk Food Bar",
    query: "Vegan Junk Food Bar Staringplein Amsterdam",
    city: "Amsterdam",
    country: "Netherlands",
    expectedLat: 52.3592,
    expectedLng: 4.8614,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-lis-ao26",
    name: "Ao 26 Vegan Food Project",
    query: "Ao 26 Vegan Vitor Cordon Lisboa",
    city: "Lisbon",
    country: "Portugal",
    expectedLat: 38.7093,
    expectedLng: -9.1412,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-lis-gambuzino",
    name: "O Gambuzino",
    query: "O Gambuzino Rua dos Anjos Lisboa",
    city: "Lisbon",
    country: "Portugal",
    expectedLat: 38.7225,
    expectedLng: -9.1351,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-opo-kind-kitchen",
    name: "Kind Kitchen",
    query: "Kind Kitchen Bonjardim Porto",
    city: "Porto",
    country: "Portugal",
    expectedLat: 41.1495,
    expectedLng: -8.6083,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-pra-loving-hut",
    name: "Loving Hut Na Porici",
    query: "Loving Hut Na Porici Prague",
    city: "Prague",
    country: "Czechia",
    expectedLat: 50.0898,
    expectedLng: 14.4326,
    maxDistanceMeters: 800,
  },
  {
    id: "eu-war-krowarzywa",
    name: "Krowarzywa",
    query: "Krowarzywa Marszalkowska Warsaw",
    city: "Warsaw",
    country: "Poland",
    expectedLat: 52.2241,
    expectedLng: 21.0152,
    maxDistanceMeters: 800,
  },

  // ========================================================
  // 4. EUA, CANADÀ, LLATINOAMÈRICA I RESTA DEL MÓN (13)
  // ========================================================
  {
    id: "us-nyc-dirt-candy",
    name: "Dirt Candy",
    query: "Dirt Candy Allen Street New York",
    city: "New York",
    country: "USA",
    expectedLat: 40.7188,
    expectedLng: -73.9904,
    maxDistanceMeters: 1000,
  },
  {
    id: "us-la-crossroads",
    name: "Crossroads Kitchen",
    query: "Crossroads Kitchen Melrose Los Angeles",
    city: "Los Angeles",
    country: "USA",
    expectedLat: 34.0838,
    expectedLng: -118.3742,
    maxDistanceMeters: 1000,
  },
  {
    id: "us-chi-chicago-diner",
    name: "The Chicago Diner",
    query: "The Chicago Diner Halsted Chicago",
    city: "Chicago",
    country: "USA",
    expectedLat: 41.9442,
    expectedLng: -87.6496,
    maxDistanceMeters: 1000,
  },
  {
    id: "us-atx-arlos",
    name: "Arlo's",
    query: "Arlo's Red River Austin",
    city: "Austin",
    country: "USA",
    expectedLat: 30.2694,
    expectedLng: -97.7362,
    maxDistanceMeters: 1000,
  },
  {
    id: "us-sea-plum",
    name: "Plum Bistro",
    query: "Plum Bistro 15th Ave Seattle",
    city: "Seattle",
    country: "USA",
    expectedLat: 47.6214,
    expectedLng: -122.3126,
    maxDistanceMeters: 1000,
  },
  {
    id: "ca-mtl-aux-vivres",
    name: "Aux Vivres",
    query: "Aux Vivres Saint-Laurent Montreal",
    city: "Montreal",
    country: "Canada",
    expectedLat: 45.5208,
    expectedLng: -73.5855,
    maxDistanceMeters: 1000,
  },
  {
    id: "ca-tor-doomies",
    name: "Doomies Toronto",
    query: "Doomies Queen Street West Toronto",
    city: "Toronto",
    country: "Canada",
    expectedLat: 43.6428,
    expectedLng: -79.4262,
    maxDistanceMeters: 1000,
  },
  {
    id: "mx-cdmx-por-siempre",
    name: "Por Siempre Vegana",
    query: "Por Siempre Vegana Manzanillo Roma Norte CDMX",
    city: "Mexico City",
    country: "Mexico",
    expectedLat: 19.4146,
    expectedLng: -99.1662,
    maxDistanceMeters: 1000,
  },
  {
    id: "ar-bue-sampa",
    name: "Sampa",
    query: "Sampa Scalabrini Ortiz Buenos Aires",
    city: "Buenos Aires",
    country: "Argentina",
    expectedLat: -34.5902,
    expectedLng: -58.4287,
    maxDistanceMeters: 1000,
  },
  {
    id: "au-mel-smith-deli",
    name: "Smith & Deli",
    query: "Smith and Deli Cambridge Collingwood Melbourne",
    city: "Melbourne",
    country: "Australia",
    expectedLat: -37.8018,
    expectedLng: 144.9782,
    maxDistanceMeters: 1200,
  },
  {
    id: "au-syd-lord-fries",
    name: "Lord of the Fries",
    query: "Lord of the Fries George Street Sydney",
    city: "Sydney",
    country: "Australia",
    expectedLat: -33.8765,
    expectedLng: 151.2069,
    maxDistanceMeters: 1200,
  },
  {
    id: "nz-akl-wise-cicada",
    name: "Wise Cicada",
    query: "Wise Cicada Crowhurst Newmarket Auckland",
    city: "Auckland",
    country: "New Zealand",
    expectedLat: -36.8682,
    expectedLng: 174.7765,
    maxDistanceMeters: 1200,
  },
  {
    id: "jp-tok-chabuzen",
    name: "Chabuzen",
    query: "Chabuzen Daita Setagaya Tokyo",
    city: "Tokyo",
    country: "Japan",
    expectedLat: 35.6582,
    expectedLng: 139.6601,
    maxDistanceMeters: 1200,
  },
];

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function runBenchmark() {
  console.log(`\n======================================================`);
  console.log(`🚀 INICIANT BENCHMARK DE COBERTURA (75 RESTAURANTS REALS)`);
  console.log(`Distribució: Catalunya (25), Europa (25), UK (12), Resta Món (13)`);
  console.log(`======================================================\n`);

  const app = await buildApp(new MemoryRepository());

  let totalTested = 0;
  let top1Matches = 0;
  let top3Matches = 0;
  let top5Matches = 0;
  let notFound = 0;
  let totalDistanceErrorMeters = 0;
  let withOpeningHours = 0;
  let totalLatencyMs = 0;

  const resultsByRegion: Record<string, { total: number; found: number }> = {
    Catalunya: { total: 0, found: 0 },
    Europe: { total: 0, found: 0 },
    UK: { total: 0, found: 0 },
    World: { total: 0, found: 0 },
  };

  for (const item of BENCHMARK_DATASET) {
    totalTested++;
    const regionKey =
      item.country === "Catalunya"
        ? "Catalunya"
        : item.country === "UK"
        ? "UK"
        : ["Spain", "France", "Germany", "Italy", "Austria", "Netherlands", "Portugal", "Czechia", "Poland"].includes(item.country)
        ? "Europe"
        : "World";

    resultsByRegion[regionKey].total++;

    const startTime = performance.now();
    const queryUrl = `/v1/restaurants/search?q=${encodeURIComponent(item.query)}&latitude=${item.expectedLat}&longitude=${item.expectedLng}`;
    const response = await app.inject({
      method: "GET",
      url: queryUrl,
    });
    const latencyMs = Math.round(performance.now() - startTime);
    totalLatencyMs += latencyMs;

    let candidates: RestaurantCandidate[] = [];
    if (response.statusCode === 200) {
      try {
        candidates = JSON.parse(response.payload) as RestaurantCandidate[];
      } catch {
        candidates = [];
      }
    }

    let matchRank: number | null = null;
    let matchedCandidate: RestaurantCandidate | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i]!;
      const dist = haversineDistanceMeters(
        item.expectedLat,
        item.expectedLng,
        cand.latitude,
        cand.longitude,
      );

      if (dist <= item.maxDistanceMeters) {
        matchRank = i + 1;
        matchedCandidate = cand;
        minDistance = dist;
        break;
      }
    }

    const hasHours = Boolean(matchedCandidate?.openingHours || matchedCandidate?.isOpenNow !== undefined);
    if (hasHours) withOpeningHours++;

    if (matchRank === 1) {
      top1Matches++;
      top3Matches++;
      top5Matches++;
      resultsByRegion[regionKey].found++;
      totalDistanceErrorMeters += minDistance;
      console.log(`✅ [TOP 1] ${item.name} (${item.city}, ${item.country}) - Dist: ${Math.round(minDistance)}m | Prov: ${matchedCandidate?.provider} | Horaris: ${hasHours ? "Sí" : "No"} (${latencyMs}ms)`);
    } else if (matchRank && matchRank <= 3) {
      top3Matches++;
      top5Matches++;
      resultsByRegion[regionKey].found++;
      totalDistanceErrorMeters += minDistance;
      console.log(`🟡 [TOP ${matchRank}] ${item.name} (${item.city}, ${item.country}) - Dist: ${Math.round(minDistance)}m | Prov: ${matchedCandidate?.provider} | Horaris: ${hasHours ? "Sí" : "No"} (${latencyMs}ms)`);
    } else if (matchRank && matchRank <= 5) {
      top5Matches++;
      resultsByRegion[regionKey].found++;
      totalDistanceErrorMeters += minDistance;
      console.log(`🟠 [TOP ${matchRank}] ${item.name} (${item.city}, ${item.country}) - Dist: ${Math.round(minDistance)}m | Prov: ${matchedCandidate?.provider} | Horaris: ${hasHours ? "Sí" : "No"} (${latencyMs}ms)`);
    } else {
      notFound++;
      console.log(`❌ [NO TROBAT] ${item.name} (${item.city}, ${item.country}) - Retornat: ${candidates[0]?.name || "cap resultat"} (${latencyMs}ms)`);
    }
  }

  await app.close();

  const totalFound = top5Matches;
  const coveragePercent = Math.round((totalFound / totalTested) * 100);
  const top1Percent = Math.round((top1Matches / totalTested) * 100);
  const avgDistance = totalFound > 0 ? Math.round(totalDistanceErrorMeters / totalFound) : 0;
  const hoursCoveragePercent = totalFound > 0 ? Math.round((withOpeningHours / totalFound) * 100) : 0;
  const avgLatency = Math.round(totalLatencyMs / totalTested);

  console.log(`\n======================================================`);
  console.log(`📊 RESULTATS FINALS DEL BENCHMARK EXPANDIT (75 RESTAURANTS)`);
  console.log(`======================================================`);
  console.log(`Total Restaurants Provats: ${totalTested}`);
  console.log(`🎯 Cobertura Total (Top 5): ${totalFound}/${totalTested} (${coveragePercent}%)`);
  console.log(`🥇 Precisió Top 1:          ${top1Matches}/${totalTested} (${top1Percent}%)`);
  console.log(`🥈 Precisió Top 3:          ${top3Matches}/${totalTested} (${Math.round((top3Matches / totalTested) * 100)}%)`);
  console.log(`❌ No trobats / Desviats:   ${notFound}/${totalTested} (${Math.round((notFound / totalTested) * 100)}%)`);
  console.log(`📍 Error de distància mitjà: ${avgDistance} metres`);
  console.log(`🕒 Cobertura d'horaris:     ${withOpeningHours}/${totalFound} (${hoursCoveragePercent}%)`);
  console.log(`⚡ Latència mitjana:         ${avgLatency} ms`);
  console.log(`------------------------------------------------------`);
  console.log(`📈 Cobertura per Regió:`);
  for (const [region, data] of Object.entries(resultsByRegion)) {
    const pct = data.total > 0 ? Math.round((data.found / data.total) * 100) : 0;
    console.log(`   - ${region.padEnd(12)}: ${data.found}/${data.total} (${pct}%)`);
  }
  console.log(`======================================================\n`);
}

runBenchmark().catch((err) => {
  console.error("Error executant el benchmark:", err);
  process.exit(1);
});
