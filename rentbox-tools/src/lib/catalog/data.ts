import { 
  Category, 
  Product, 
  Locker, 
  PaginatedResult,
  CatalogFilters,
  CategoryWithProductCount,
  AvailabilityStatus,
  PriceUnit,
} from "./types";

// =============================================================================
// SEED DATA - Categories (locked as per requirements)
// =============================================================================
export const CATEGORIES: Category[] = [
  {
    id: "cat-1",
    slug: "aiatoo",
    name: "Aiatöö",
    description: "Muruhooldus ja õuetööd",
    icon: "🪴",
    order: 1,
    active: true,
  },
  {
    id: "cat-2",
    slug: "puurimine-kinnitamine",
    name: "Puurimine & kinnitamine",
    description: "Trellid ja kinnitustööd",
    icon: "🧰",
    order: 2,
    active: true,
  },
  {
    id: "cat-3",
    slug: "loikamine-saagimine",
    name: "Lõikamine & saagimine",
    description: "Saed ja lõiketööd",
    icon: "🪚",
    order: 3,
    active: true,
  },
  {
    id: "cat-4",
    slug: "lihvimine-viimistlus",
    name: "Lihvimine & viimistlus",
    description: "Lihv, frees, poleerimine",
    icon: "🧽",
    order: 4,
    active: true,
  },
  {
    id: "cat-5",
    slug: "puhastus",
    name: "Puhastus",
    description: "Survepesu ja tolmuvaba töö",
    icon: "🧼",
    order: 5,
    active: true,
  },
  {
    id: "cat-6",
    slug: "betoon-kivi",
    name: "Betoon & kivimaterjal",
    description: "Kivi ja betooni tööriistad",
    icon: "🧱",
    order: 6,
    active: true,
  },
  {
    id: "cat-7",
    slug: "moodistamine-markimine",
    name: "Mõõdistamine & märkimine",
    description: "Täpne mõõt ja nivoo",
    icon: "📏",
    order: 7,
    active: true,
  },
  {
    id: "cat-8",
    slug: "tostmine-transport",
    name: "Tõstmine & transport",
    description: "Liigutamine ja tõstmine",
    icon: "🛠️",
    order: 8,
    active: true,
  },
  {
    id: "cat-9",
    slug: "tarvikud-kulumaterjal",
    name: "Tarvikud & kulumaterjal",
    description: "Otsikud, kettad, akud, lisad",
    icon: "🔩",
    order: 9,
    active: true,
  },
];

// =============================================================================
// SEED DATA - Sample Products
// =============================================================================
export const PRODUCTS: Product[] = [
  // Aiatöö
  {
    id: "prod-1",
    slug: "makita-muruniiduk-36v",
    name: "Makita muruniiduk 36V",
    shortDescription: "Võimas akuga muruniiduk kuni 500m² murule",
    description: "Professionaalne Makita akuga muruniiduk, mis sobib ideaalselt keskmise suurusega aiale. Vaikne töö, null emissiooni ja mugav kasutada. Komplektis 2x 18V 5Ah akut ja topeltlaadija.",
    categoryId: "cat-1",
    categorySlug: "aiatoo",
    tags: ["Makita", "aiatöö", "aku"],
    basePrice: 25,
    priceUnit: "day",
    images: ["/images/products/makita-muruniiduk.jpg"],
    specs: [
      { label: "Lõikelaius", value: "43 cm" },
      { label: "Lõikekõrgus", value: "20-75 mm" },
      { label: "Aku", value: "2x 18V 5.0Ah" },
      { label: "Kaal", value: "16.5 kg" },
    ],
    includes: ["Muruniiduk", "2x aku 18V 5.0Ah", "Topeltlaadija", "Kasutusjuhend"],
    active: true,
    createdAt: new Date("2024-01-15"),
    availabilityStatus: "available",
    compartmentCount: 3,
  },
  {
    id: "prod-2",
    slug: "stihl-trimmervorm-fsa-57",
    name: "Stihl trimmer FSA 57",
    shortDescription: "Kerge ja võimas trimmer servade viimistluseks",
    description: "Stihl FSA 57 on ideaalne kodukasutajale, kes otsib kerget aga efektiivset trimmerit. Sobib nii muru servade viimistluseks kui ka suurema rohu niitmiseks.",
    categoryId: "cat-1",
    categorySlug: "aiatoo",
    tags: ["Stihl", "aiatöö", "aku"],
    basePrice: 15,
    priceUnit: "day",
    images: ["/images/products/stihl-trimmer.jpg"],
    specs: [
      { label: "Lõikediameeter", value: "33 cm" },
      { label: "Aku", value: "AK 10" },
      { label: "Kaal", value: "2.6 kg" },
    ],
    includes: ["Trimmer", "Aku AK 10", "Laadija", "Nöölidoos"],
    active: true,
    createdAt: new Date("2024-02-01"),
    availabilityStatus: "available",
    compartmentCount: 2,
  },
  // Puurimine & kinnitamine
  {
    id: "prod-3",
    slug: "makita-akutrell-ddf484",
    name: "Makita akutrell DDF484",
    shortDescription: "Kompaktne ja võimas akutrell igapäevaseks kasutuseks",
    description: "Makita DDF484 on professionaalne akutrell, mis sobib nii puurimiseks kui ka kruvimiseks. Harjavaba mootor tagab pika eluea ja suurepärase jõudluse.",
    categoryId: "cat-2",
    categorySlug: "puurimine-kinnitamine",
    tags: ["Makita", "puurimine", "aku"],
    basePrice: 12,
    priceUnit: "day",
    images: ["/images/products/makita-trell.jpg"],
    specs: [
      { label: "Pöördemoment", value: "54 Nm" },
      { label: "Pöörded", value: "0-2100 rpm" },
      { label: "Padrun", value: "13 mm võtmeta" },
      { label: "Aku", value: "18V 5.0Ah" },
    ],
    includes: ["Trell", "2x aku 18V 5.0Ah", "Laadija", "Kohver"],
    active: true,
    createdAt: new Date("2024-01-10"),
    availabilityStatus: "available",
    compartmentCount: 5,
  },
  {
    id: "prod-4",
    slug: "bosch-perforaator-gbh-2-28f",
    name: "Bosch perforaator GBH 2-28 F",
    shortDescription: "SDS-plus perforaator betooni ja müüritöödeks",
    description: "Bosch GBH 2-28 F on mitmekülgne perforaator, mis sobib puurimiseks betooni, tellisesse ja kiviseintta. Vahetatava padruniga versioon võimaldab kasutada ka tavalisi puure.",
    categoryId: "cat-2",
    categorySlug: "puurimine-kinnitamine",
    tags: ["Bosch", "puurimine", "ehitus"],
    basePrice: 18,
    priceUnit: "day",
    images: ["/images/products/bosch-perforaator.jpg"],
    specs: [
      { label: "Löögijõud", value: "3.2 J" },
      { label: "Võimsus", value: "880 W" },
      { label: "Puurimine betooni", value: "kuni 28 mm" },
      { label: "Kaal", value: "2.9 kg" },
    ],
    includes: ["Perforaator", "SDS-plus padrun", "Võtmeta padrun", "Kohver", "Lisakäepide"],
    active: true,
    createdAt: new Date("2024-01-20"),
    availabilityStatus: "limited",
    compartmentCount: 1,
  },
  // Puhastus
  {
    id: "prod-5",
    slug: "karcher-survepesur-k5",
    name: "Kärcher survepesur K5",
    shortDescription: "Võimas survepesur terrassi ja auto pesemiseks",
    description: "Kärcher K5 Full Control on võimas survepesur, mis sobib nii auto, terrassi kui ka fassaadi pesemiseks. Reguleeritav surve ja mugav kasutamine.",
    categoryId: "cat-5",
    categorySlug: "puhastus",
    tags: ["Kärcher", "puhastus"],
    basePrice: 20,
    priceUnit: "day",
    images: ["/images/products/karcher-k5.jpg"],
    specs: [
      { label: "Surve", value: "20-145 bar" },
      { label: "Vooluhulk", value: "500 l/h" },
      { label: "Võimsus", value: "2100 W" },
      { label: "Vooliku pikkus", value: "8 m" },
    ],
    includes: ["Survepesur", "Voolik 8m", "Põrandapesuotsik", "Putukaepesuri", "Vahugeneraator"],
    active: true,
    createdAt: new Date("2024-02-15"),
    availabilityStatus: "available",
    compartmentCount: 2,
  },
  {
    id: "prod-6",
    slug: "karcher-auru-puhastaja-sc3",
    name: "Kärcher aurupuhastaja SC3",
    shortDescription: "Kemikaalivaba puhastus auruga",
    description: "Kärcher SC3 aurupuhastaja puhastab ainult kuuma auruga - pole vaja kemikaale. Ideaalne köögis, vannitoas ja põrandatel kasutamiseks.",
    categoryId: "cat-5",
    categorySlug: "puhastus",
    tags: ["Kärcher", "puhastus"],
    basePrice: 15,
    priceUnit: "day",
    images: ["/images/products/karcher-sc3.jpg"],
    specs: [
      { label: "Aurusurve", value: "3.5 bar" },
      { label: "Küttekeha", value: "1900 W" },
      { label: "Paagi maht", value: "1 l" },
      { label: "Kaabel", value: "4 m" },
    ],
    includes: ["Aurupuhastaja", "Põrandaotsik", "Käsiotsik", "Tarvikutekomplekt", "Lapid"],
    active: true,
    createdAt: new Date("2024-03-01"),
    availabilityStatus: "unavailable",
    compartmentCount: 0,
  },
  // Lõikamine & saagimine
  {
    id: "prod-7",
    slug: "makita-ketassaag-dhs680",
    name: "Makita ketassaag DHS680",
    shortDescription: "Kompaktne akuga ketassaag täpseteks lõigeteks",
    description: "Makita DHS680 on harjavaba mootoriga ketassaag, mis pakub pikaajalist kasutust ja täpseid lõikeid. Sobib nii ehitusplatsil kui ka töökojas.",
    categoryId: "cat-3",
    categorySlug: "loikamine-saagimine",
    tags: ["Makita", "lõikamine", "aku"],
    basePrice: 18,
    priceUnit: "day",
    images: ["/images/products/makita-ketassaag.jpg"],
    specs: [
      { label: "Ketasdiameeter", value: "165 mm" },
      { label: "Lõikesügavus 90°", value: "57 mm" },
      { label: "Lõikesügavus 45°", value: "41 mm" },
      { label: "Kaal", value: "3.3 kg" },
    ],
    includes: ["Ketassaag", "Saeketas 165mm", "Juhik", "Aku 18V 5.0Ah", "Laadija"],
    active: true,
    createdAt: new Date("2024-02-10"),
    availabilityStatus: "available",
    compartmentCount: 2,
  },
  {
    id: "prod-8",
    slug: "bosch-tikksaag-gst-18v-li",
    name: "Bosch tikksaag GST 18V-LI",
    shortDescription: "Akuga tikksaag kõverateks ja sirgeks lõigeteks",
    description: "Bosch GST 18V-LI on mitmekülgne tikksaag, mis sobib nii puidu, metalli kui ka plastiku lõikamiseks. Madal vibratsioon ja täpne juhtimine.",
    categoryId: "cat-3",
    categorySlug: "loikamine-saagimine",
    tags: ["Bosch", "lõikamine", "aku"],
    basePrice: 14,
    priceUnit: "day",
    images: ["/images/products/bosch-tikksaag.jpg"],
    specs: [
      { label: "Lõikesügavus puit", value: "120 mm" },
      { label: "Lõikesügavus metall", value: "8 mm" },
      { label: "Kaaldumine", value: "0-45°" },
      { label: "Kaal", value: "2.5 kg" },
    ],
    includes: ["Tikksaag", "Saeterade komplekt", "Aku 18V 4.0Ah", "Laadija", "Kohver"],
    active: true,
    createdAt: new Date("2024-02-20"),
    availabilityStatus: "available",
    compartmentCount: 3,
  },
  // Lihvimine & viimistlus
  {
    id: "prod-9",
    slug: "makita-ekstsentriklihvija-dbo180",
    name: "Makita ekstsentriklihvija DBO180",
    shortDescription: "Akuga lihvija peeneks viimistluseks",
    description: "Makita DBO180 ekstsentriklihvija on ideaalne puidu, metalli ja lakitud pindade lihvimiseks. Tolmueemaldus tagab puhta töökeskkonna.",
    categoryId: "cat-4",
    categorySlug: "lihvimine-viimistlus",
    tags: ["Makita", "lihvimine", "aku"],
    basePrice: 12,
    priceUnit: "day",
    images: ["/images/products/makita-lihvija.jpg"],
    specs: [
      { label: "Ketasdiameeter", value: "125 mm" },
      { label: "Orbiit", value: "2.8 mm" },
      { label: "Pöörded", value: "7000-11000 rpm" },
      { label: "Kaal", value: "1.4 kg" },
    ],
    includes: ["Lihvija", "Lihvpaberid (komplekt)", "Aku 18V 3.0Ah", "Laadija", "Tolmukott"],
    active: true,
    createdAt: new Date("2024-03-05"),
    availabilityStatus: "available",
    compartmentCount: 4,
  },
  {
    id: "prod-10",
    slug: "bosch-nurklihvija-gws-18v-10",
    name: "Bosch nurklihvija GWS 18V-10",
    shortDescription: "Võimas akuga nurklihvija metalli ja kivi jaoks",
    description: "Bosch GWS 18V-10 on professionaalne akuga nurklihvija, mis sobib metalli lõikamiseks, rooste eemaldamiseks ja pindade lihvimiseks.",
    categoryId: "cat-4",
    categorySlug: "lihvimine-viimistlus",
    tags: ["Bosch", "lihvimine", "aku"],
    basePrice: 16,
    priceUnit: "day",
    images: ["/images/products/bosch-nurklihvija.jpg"],
    specs: [
      { label: "Ketasdiameeter", value: "125 mm" },
      { label: "Pöörded", value: "9000 rpm" },
      { label: "Kaal", value: "2.3 kg" },
    ],
    includes: ["Nurklihvija", "Lõikekettad (3tk)", "Lihvketas", "Aku 18V 4.0Ah", "Laadija"],
    active: true,
    createdAt: new Date("2024-03-10"),
    availabilityStatus: "limited",
    compartmentCount: 1,
  },
  // Betoon & kivimaterjal
  {
    id: "prod-11",
    slug: "hilti-lohkhaamer-te-500-avr",
    name: "Hilti lõhkhaamer TE 500-AVR",
    shortDescription: "Võimas lõhkhaamer betoonile ja kivile",
    description: "Hilti TE 500-AVR on professionaalne lõhkhaamer raskemateks lammutustöödeks. Aktiivne vibratsioonisummutus kaitseb kasutajat.",
    categoryId: "cat-6",
    categorySlug: "betoon-kivi",
    tags: ["Hilti", "ehitus", "betoon"],
    basePrice: 45,
    priceUnit: "day",
    images: ["/images/products/hilti-lohkhaamer.jpg"],
    specs: [
      { label: "Löögijõud", value: "8.5 J" },
      { label: "Võimsus", value: "1100 W" },
      { label: "Kaal", value: "5.3 kg" },
    ],
    includes: ["Lõhkhaamer", "Lameda ja terava peitleid", "Kohver"],
    active: true,
    createdAt: new Date("2024-01-25"),
    availabilityStatus: "available",
    compartmentCount: 2,
  },
  // Mõõdistamine & märkimine
  {
    id: "prod-12",
    slug: "bosch-lasernivoo-gcl-2-50",
    name: "Bosch lasernivoo GCL 2-50",
    shortDescription: "Rist- ja punktlaser täpseks märkimiseks",
    description: "Bosch GCL 2-50 on kombineeritud laser, mis projekteerib nii rist- kui ka punktjooni. Ideaalne seinte, plaatimise ja riiulite paigaldamiseks.",
    categoryId: "cat-7",
    categorySlug: "moodistamine-markimine",
    tags: ["Bosch", "mõõdistamine"],
    basePrice: 18,
    priceUnit: "day",
    images: ["/images/products/bosch-lasernivoo.jpg"],
    specs: [
      { label: "Täpsus", value: "±0.3 mm/m" },
      { label: "Tööulatus (jooned)", value: "15 m" },
      { label: "Tööulatus (punktid)", value: "20 m" },
      { label: "Isenivelleerumine", value: "±4°" },
    ],
    includes: ["Laser", "Statiiv", "Sihtmärgitahvel", "Patareid", "Kohver"],
    active: true,
    createdAt: new Date("2024-02-25"),
    availabilityStatus: "available",
    compartmentCount: 3,
  },
  // Tõstmine & transport
  {
    id: "prod-13",
    slug: "eurolifter-mini-tostuk",
    name: "Eurolifter mini tõstuk",
    shortDescription: "Käsitõstuk kuni 1500kg koormatele",
    description: "Kompaktne kahveltõstuk, mis sobib ideaalselt kaubaalustele ja rasketele esemetele. Madal profiil võimaldab madalate aluste tõstmist.",
    categoryId: "cat-8",
    categorySlug: "tostmine-transport",
    tags: ["transport", "tõstmine"],
    basePrice: 25,
    priceUnit: "day",
    images: ["/images/products/mini-tostuk.jpg"],
    specs: [
      { label: "Kandevõime", value: "1500 kg" },
      { label: "Kahvlipikkus", value: "1150 mm" },
      { label: "Min. kõrgus", value: "85 mm" },
      { label: "Max. kõrgus", value: "200 mm" },
    ],
    includes: ["Kahveltõstuk", "Kasutusjuhend"],
    active: true,
    createdAt: new Date("2024-03-15"),
    availabilityStatus: "available",
    compartmentCount: 2,
  },
  // Tarvikud & kulumaterjal
  {
    id: "prod-14",
    slug: "makita-aku-18v-5ah",
    name: "Makita aku 18V 5.0Ah",
    shortDescription: "Lisa- või varuaku Makita tööriistadele",
    description: "Originaal Makita 18V 5.0Ah LXT liitiumioonaku. Sobib kõikidele Makita LXT seeria tööriistadele.",
    categoryId: "cat-9",
    categorySlug: "tarvikud-kulumaterjal",
    tags: ["Makita", "aku", "tarvikud"],
    basePrice: 5,
    priceUnit: "day",
    images: ["/images/products/makita-aku.jpg"],
    specs: [
      { label: "Pinge", value: "18 V" },
      { label: "Mahtuvus", value: "5.0 Ah" },
      { label: "Tüüp", value: "Li-ion" },
      { label: "Kaal", value: "680 g" },
    ],
    includes: ["Aku 18V 5.0Ah"],
    active: true,
    createdAt: new Date("2024-01-05"),
    availabilityStatus: "available",
    compartmentCount: 10,
  },
  {
    id: "prod-15",
    slug: "bosch-puurikomplekt-pro",
    name: "Bosch puurikomplekt Pro",
    shortDescription: "Professionaalne puuride ja otsikute komplekt",
    description: "103-osaline Bosch professionaalne komplekt sisaldab puure metallile, puidule, betoonile ning kruviotsikuid ja mutrivõtmeid.",
    categoryId: "cat-9",
    categorySlug: "tarvikud-kulumaterjal",
    tags: ["Bosch", "tarvikud", "puurimine"],
    basePrice: 8,
    priceUnit: "day",
    images: ["/images/products/bosch-puurikomplekt.jpg"],
    specs: [
      { label: "Osade arv", value: "103 tk" },
      { label: "Metallipuurid", value: "1-10 mm" },
      { label: "Puidupuurid", value: "3-10 mm" },
      { label: "Betoonipuurid", value: "5-8 mm" },
    ],
    includes: ["Komplekt kohvris", "103 osa"],
    active: true,
    createdAt: new Date("2024-02-05"),
    availabilityStatus: "available",
    compartmentCount: 5,
  },
];

// =============================================================================
// SEED DATA - Lockers
// =============================================================================
export const LOCKERS: Locker[] = [
  {
    id: "locker-1",
    name: "Tallinn Ülemiste",
    locationText: "Ülemiste City, Tallinn",
    timezone: "Europe/Tallinn",
  },
  {
    id: "locker-2",
    name: "Tallinn Kesklinn",
    locationText: "Viru Keskus, Tallinn",
    timezone: "Europe/Tallinn",
  },
  {
    id: "locker-3",
    name: "Tartu",
    locationText: "Lõunakeskus, Tartu",
    timezone: "Europe/Tallinn",
  },
];

// =============================================================================
// DATA ACCESS FUNCTIONS
// =============================================================================

const PAGE_SIZE = 12;

// Available tags for filtering
export const AVAILABLE_TAGS = [
  "Makita",
  "Kärcher",
  "Bosch",
  "Hilti",
  "Stihl",
  "aiatöö",
  "ehitus",
  "puhastus",
  "lihvimine",
  "puurimine",
  "lõikamine",
  "aku",
  "tarvikud",
  "betoon",
  "transport",
  "mõõdistamine",
];

export async function getCategories(): Promise<Category[]> {
  // Simulate async data fetch
  return CATEGORIES.filter((c) => c.active).sort((a, b) => a.order - b.order);
}

export async function getCategoriesWithProductCount(): Promise<CategoryWithProductCount[]> {
  const categories = await getCategories();
  return categories.map((cat) => ({
    ...cat,
    productCount: PRODUCTS.filter(
      (p) => p.categoryId === cat.id && p.active
    ).length,
  }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return CATEGORIES.find((c) => c.slug === slug && c.active) || null;
}

export async function getProducts(
  categorySlug?: string,
  filters?: CatalogFilters
): Promise<PaginatedResult<Product>> {
  let filtered = PRODUCTS.filter((p) => p.active);

  // Filter by category
  if (categorySlug) {
    filtered = filtered.filter((p) => p.categorySlug === categorySlug);
  }

  // Apply search query
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Filter by price bucket
  if (filters?.priceBucket) {
    switch (filters.priceBucket) {
      case "0-15":
        filtered = filtered.filter((p) => p.basePrice < 15);
        break;
      case "15-30":
        filtered = filtered.filter((p) => p.basePrice >= 15 && p.basePrice < 30);
        break;
      case "30+":
        filtered = filtered.filter((p) => p.basePrice >= 30);
        break;
    }
  }

  // Filter by price unit
  if (filters?.priceUnit) {
    filtered = filtered.filter((p) => p.priceUnit === filters.priceUnit);
  }

  // Filter by tags
  if (filters?.tags && filters.tags.length > 0) {
    filtered = filtered.filter((p) =>
      filters.tags!.some((tag) => p.tags.includes(tag))
    );
  }

  // Filter by availability
  if (filters?.availability && filters.availability !== "all") {
    if (filters.availability === "available") {
      filtered = filtered.filter(
        (p) => p.availabilityStatus === "available" || p.availabilityStatus === "limited"
      );
    } else if (filters.availability === "limited") {
      filtered = filtered.filter((p) => p.availabilityStatus === "limited");
    }
  }

  // Sort
  const sort = filters?.sort || "popular";
  switch (sort) {
    case "price-asc":
      filtered.sort((a, b) => a.basePrice - b.basePrice);
      break;
    case "price-desc":
      filtered.sort((a, b) => b.basePrice - a.basePrice);
      break;
    case "newest":
      filtered.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      break;
    case "popular":
    default:
      // Sort by compartment count (more = more popular)
      filtered.sort((a, b) => b.compartmentCount - a.compartmentCount);
      break;
  }

  // Pagination
  const page = filters?.page || 1;
  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startIndex = (page - 1) * PAGE_SIZE;
  const items = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
  };
}

export async function getProductBySlug(
  categorySlug: string,
  productSlug: string
): Promise<Product | null> {
  return (
    PRODUCTS.find(
      (p) => p.categorySlug === categorySlug && p.slug === productSlug && p.active
    ) || null
  );
}

export async function getFeaturedProducts(limit: number = 6): Promise<Product[]> {
  return PRODUCTS.filter((p) => p.active && p.availabilityStatus !== "unavailable")
    .sort((a, b) => b.compartmentCount - a.compartmentCount)
    .slice(0, limit);
}

export async function getLockers(): Promise<Locker[]> {
  return LOCKERS;
}

export function getAvailabilityLabel(status: AvailabilityStatus): string {
  switch (status) {
    case "available":
      return "Saadaval";
    case "limited":
      return "Piiratud";
    case "unavailable":
      return "Pole hetkel";
  }
}

export function getAvailabilityVariant(
  status: AvailabilityStatus
): "success" | "warning" | "muted" {
  switch (status) {
    case "available":
      return "success";
    case "limited":
      return "warning";
    case "unavailable":
      return "muted";
  }
}
