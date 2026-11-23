/**
 * DEMONSTRATION DATA — for UI development, mocks, docs examples and the dev seed.
 *
 * Every record is a placeholder: titles start with "Demo", text states it is not
 * real, people are "Demo Author A/B…", DOIs use the 10.5555 test prefix and
 * images are local SVG placeholders. Nothing here describes real expeditions,
 * measurements or scientific findings. Do not replace with real-looking data.
 *
 * Fixtures are generated from a clock value so that relative dates (upcoming
 * events) stay meaningful, while docs generation can pin the clock for
 * deterministic output.
 */
import type {
  AIOutreachContent,
  AuditLogEntry,
  CategoryRef,
  Dataset,
  Expedition,
  FileAsset,
  ImageRef,
  InstitutionalActivity,
  Keyword,
  MediaAsset,
  PolarRegion,
  Publication,
  PublicationType,
  ResearchCategory,
  Submission,
  User,
  UserSummary,
} from "@/types/api";
import { formatCitation } from "@/lib/citation";
import { slugify } from "@/lib/slug";
import { AI_DISCLAIMER } from "@/contracts/schemas/ai";

export const DEMO_NOTICE = "Demonstration content for UI development only — this is not real scientific information.";
export const DEMO_PASSWORD = "demo-password-123";
export const DEMO_INSTITUTE = "Demo Institute of Polar Research";

const STATIC_TS = "2025-06-01T08:00:00.000Z";

export interface Fixtures {
  users: User[];
  passwords: Record<string, string>;
  categories: ResearchCategory[];
  keywords: Keyword[];
  files: FileAsset[];
  expeditions: Expedition[];
  publications: Publication[];
  datasets: Dataset[];
  media: MediaAsset[];
  activities: InstitutionalActivity[];
  aiContent: AIOutreachContent[];
  submissions: Submission[];
  auditLogs: AuditLogEntry[];
  /** Owner of each content record (contentId → userId), for permission checks. */
  owners: Record<string, string>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const pick = <T,>(arr: readonly T[], i: number): T => arr[i % arr.length];

function image(n: number, alt: string): ImageRef {
  return { url: `/demo/polar-${((n - 1) % 6) + 1}.svg`, alt, width: 1600, height: 900, credit: "Demo placeholder image" };
}

export function createFixtures(now: Date = new Date()): Fixtures {
  const day = 86_400_000;
  const rel = (days: number, hourUtc = 10) => {
    const d = new Date(now.getTime() + days * day);
    d.setUTCHours(hourUtc, 0, 0, 0);
    return d.toISOString();
  };

  // ─── Users ──────────────────────────────────────────────────────────────
  const mkUser = (id: string, name: string, role: User["role"], email: string): User => ({
    id,
    email,
    name,
    role,
    status: "ACTIVE",
    affiliation: DEMO_INSTITUTE,
    bio: `${name} is a demo account. ${DEMO_NOTICE}`,
    avatarUrl: null,
    createdAt: "2025-01-10T09:00:00.000Z",
    lastLoginAt: null,
  });
  const users: User[] = [
    mkUser("usr_demo_admin", "Demo Admin", "ADMIN", "admin@demo.oceanx.local"),
    mkUser("usr_demo_editor", "Demo Editor", "EDITOR", "editor@demo.oceanx.local"),
    mkUser("usr_demo_researcher", "Demo Researcher", "RESEARCHER", "researcher@demo.oceanx.local"),
    mkUser("usr_demo_member", "Demo Member", "MEMBER", "member@demo.oceanx.local"),
  ];
  const passwords = Object.fromEntries(users.map((u) => [u.email, DEMO_PASSWORD]));
  const summaryOf = (id: string): UserSummary => {
    const u = users.find((x) => x.id === id)!;
    return { id: u.id, name: u.name, affiliation: u.affiliation, avatarUrl: u.avatarUrl };
  };

  // ─── Taxonomy ───────────────────────────────────────────────────────────
  const categoryDefs: [string, string, string | null, string][] = [
    ["cat_glaciology", "Glaciology", null, "Glaciers, ice sheets and ice dynamics."],
    ["cat_sea_ice", "Sea Ice", null, "Formation, extent and properties of sea ice."],
    ["cat_oceanography", "Oceanography", null, "Physical and chemical ocean processes."],
    ["cat_ocean_biology", "Ocean Biology", "cat_oceanography", "Marine life in polar oceans."],
    ["cat_atmospheric", "Atmospheric Science", null, "Weather, aerosols and atmospheric chemistry."],
    ["cat_climate", "Climate Change", null, "Long-term change in the polar regions."],
    ["cat_geology", "Polar Geology", null, "Rocks, sediments and landforms."],
    ["cat_biology", "Polar Biology", null, "Terrestrial and freshwater ecosystems."],
    ["cat_remote_sensing", "Remote Sensing", null, "Satellite and airborne observation."],
    ["cat_logistics", "Expedition Logistics", null, "Planning and operating field campaigns."],
  ];
  const categories: ResearchCategory[] = categoryDefs.map(([id, name, parentId, description], i) => ({
    id,
    slug: slugify(name),
    name,
    description: `${description} (Demo category.)`,
    parentId,
    sortOrder: i + 1,
    counts: null,
  }));
  const cat = (id: string): CategoryRef => {
    const c = categories.find((x) => x.id === id)!;
    return { id: c.id, slug: c.slug, name: c.name };
  };

  const keywordLabels = [
    "sea ice", "ice cores", "glacier mass balance", "remote sensing", "ocean temperature", "salinity",
    "aerosols", "krill", "snow cover", "permafrost", "ice shelf", "meteorology", "bathymetry",
    "phytoplankton", "fjords", "albedo", "gnss", "outreach", "citizen science", "field methods",
  ];
  const keywords: Keyword[] = keywordLabels.map((label, i) => ({
    id: `kw_demo_${pad(i + 1)}`,
    slug: slugify(label),
    label,
    usageCount: 0,
  }));

  // ─── Files ──────────────────────────────────────────────────────────────
  const files: FileAsset[] = [];
  const mkFile = (
    n: number,
    fileName: string,
    contentType: string,
    sizeBytes: number,
    purpose: FileAsset["purpose"],
    accessLevel: FileAsset["accessLevel"],
  ): FileAsset => {
    const id = `file_demo_${pad(n)}`;
    const f: FileAsset = {
      id,
      fileName,
      contentType,
      sizeBytes,
      purpose,
      accessLevel,
      status: "READY",
      checksumSha256: null,
      downloadUrl: `/api/v1/files/${id}/download`,
      downloadCount: (n * 37) % 400,
      uploadedBy: summaryOf("usr_demo_researcher"),
      createdAt: STATIC_TS,
    };
    files.push(f);
    return f;
  };
  const fileRef = (f: FileAsset) => ({
    id: f.id,
    fileName: f.fileName,
    contentType: f.contentType,
    sizeBytes: f.sizeBytes,
    accessLevel: f.accessLevel,
    downloadUrl: f.downloadUrl,
  });

  // ─── Expeditions ────────────────────────────────────────────────────────
  const expeditionDefs: {
    title: string;
    region: PolarRegion;
    phase: Expedition["phase"];
    year: number;
    start: string | null;
    end: string | null;
    cats: string[];
    kws: string[];
    loc: [number, number, string];
    vessel: string | null;
  }[] = [
    { title: "Antarctic Coastal Ice Survey", region: "ANTARCTICA", phase: "COMPLETED", year: 2024, start: "2024-11-20", end: "2025-03-10", cats: ["cat_glaciology", "cat_remote_sensing"], kws: ["ice shelf", "remote sensing", "gnss"], loc: [-69.5, 76.2, "Demo coastal site A"], vessel: "Demo Vessel One" },
    { title: "Southern Ocean Transect", region: "SOUTHERN_OCEAN", phase: "COMPLETED", year: 2024, start: "2024-01-05", end: "2024-02-28", cats: ["cat_oceanography", "cat_ocean_biology"], kws: ["ocean temperature", "salinity", "krill"], loc: [-55.0, 60.0, "Demo transect midpoint"], vessel: "Demo Vessel Two" },
    { title: "Arctic Fjord Observations", region: "ARCTIC", phase: "COMPLETED", year: 2023, start: "2023-06-01", end: "2023-08-15", cats: ["cat_oceanography", "cat_climate"], kws: ["fjords", "phytoplankton", "ocean temperature"], loc: [78.9, 11.9, "Demo fjord station"], vessel: null },
    { title: "Himalayan Glacier Monitoring", region: "HIMALAYA", phase: "ONGOING", year: 2025, start: "2025-05-01", end: null, cats: ["cat_glaciology", "cat_climate"], kws: ["glacier mass balance", "snow cover", "albedo"], loc: [32.2, 77.5, "Demo glacier camp"], vessel: null },
    { title: "Antarctic Winter-Over Programme", region: "ANTARCTICA", phase: "ONGOING", year: 2025, start: "2025-02-15", end: null, cats: ["cat_atmospheric", "cat_logistics"], kws: ["meteorology", "aerosols", "field methods"], loc: [-70.8, 11.7, "Demo Station A"], vessel: null },
    { title: "Arctic Summer Field Campaign", region: "ARCTIC", phase: "PLANNED", year: 2026, start: "2026-06-10", end: "2026-08-30", cats: ["cat_biology", "cat_logistics"], kws: ["permafrost", "field methods", "citizen science"], loc: [79.0, 12.0, "Demo Station B"], vessel: null },
    { title: "Ice Shelf Edge Mapping", region: "ANTARCTICA", phase: "COMPLETED", year: 2022, start: "2022-12-01", end: "2023-02-20", cats: ["cat_remote_sensing", "cat_geology"], kws: ["ice shelf", "bathymetry", "remote sensing"], loc: [-70.2, 2.5, "Demo ice shelf front"], vessel: "Demo Vessel One" },
    { title: "High-Altitude Snow Sampling", region: "HIMALAYA", phase: "PLANNED", year: 2026, start: "2026-04-01", end: "2026-05-15", cats: ["cat_climate", "cat_atmospheric"], kws: ["snow cover", "aerosols", "ice cores"], loc: [30.9, 79.0, "Demo high camp"], vessel: null },
    { title: "Sea Ice Thickness Pilot (Draft)", region: "ARCTIC", phase: "PLANNED", year: 2026, start: null, end: null, cats: ["cat_sea_ice"], kws: ["sea ice"], loc: [80.0, 20.0, "Demo pack-ice site"], vessel: null },
  ];
  const owners: Record<string, string> = {};
  const expeditions: Expedition[] = expeditionDefs.map((d, i) => {
    const n = i + 1;
    const id = `exp_demo_${pad(n)}`;
    const isDraft = n === 9;
    owners[id] = isDraft ? "usr_demo_researcher" : "usr_demo_editor";
    return {
      id,
      slug: `demo-${slugify(d.title.replace(/\(Draft\)/, ""))}`,
      title: `Demo Expedition: ${d.title}`,
      summary: `Placeholder summary for this demo expedition card. ${DEMO_NOTICE}`,
      region: d.region,
      phase: d.phase,
      year: d.year,
      startDate: d.start,
      endDate: d.end,
      station: d.vessel ? null : `Demo Station ${String.fromCharCode(65 + (i % 3))}`,
      vessel: d.vessel,
      coverImage: image(n, `Placeholder landscape for ${d.title}`),
      categories: d.cats.map(cat),
      keywords: d.kws,
      status: isDraft ? "DRAFT" : "PUBLISHED",
      publishedAt: isDraft ? null : `${d.year}-0${(n % 8) + 1}-15T09:00:00.000Z`,
      createdAt: `${d.year - (d.phase === "PLANNED" ? 1 : 0)}-01-0${(n % 8) + 1}T09:00:00.000Z`,
      updatedAt: STATIC_TS,
      description:
        `## About this demo record\n\n${DEMO_NOTICE}\n\n` +
        "In a real record, this Markdown section would describe the expedition's context, team, route and outcomes.\n\n" +
        "## Placeholder section\n\n- Item one\n- Item two",
      objectives: ["Placeholder objective one", "Placeholder objective two", "Placeholder objective three"],
      leadInstitution: DEMO_INSTITUTE,
      chiefScientist: "Demo Scientist",
      participantCount: d.phase === "PLANNED" ? null : 12 + n * 3,
      location: { latitude: d.loc[0], longitude: d.loc[1], label: d.loc[2] },
      counts: { publications: 0, datasets: 0, media: 0 },
    };
  });
  const expRef = (id: string | null) => {
    if (!id) return null;
    const e = expeditions.find((x) => x.id === id)!;
    return { id: e.id, slug: e.slug, title: e.title, year: e.year };
  };

  // ─── Publications ───────────────────────────────────────────────────────
  const pubTopics = [
    "sea ice variability", "glacier surface features", "ocean temperature profiles", "aerosol sampling methods",
    "krill survey design", "snow cover mapping", "ice core handling procedures", "fjord circulation modelling",
    "phytoplankton observation workflows", "permafrost monitoring set-up", "ice shelf mapping techniques",
    "meteorological station data quality", "bathymetric survey planning", "outreach programme evaluation",
    "remote sensing calibration",
  ];
  const pubTypes: PublicationType[] = ["JOURNAL_ARTICLE", "CONFERENCE_PAPER", "REPORT", "JOURNAL_ARTICLE", "THESIS", "TECHNICAL_NOTE", "DATA_PAPER", "BOOK_CHAPTER"];
  const regions: PolarRegion[] = ["ANTARCTICA", "ARCTIC", "SOUTHERN_OCEAN", "HIMALAYA"];
  const pubExpeditions = ["exp_demo_01", "exp_demo_02", "exp_demo_03", "exp_demo_04", null, "exp_demo_07", null];
  const pubCats = ["cat_sea_ice", "cat_glaciology", "cat_oceanography", "cat_atmospheric", "cat_ocean_biology", "cat_remote_sensing", "cat_climate"];

  const publications: Publication[] = pubTopics.map((topic, i) => {
    const n = i + 1;
    const id = `pub_demo_${pad(n)}`;
    const type = pick(pubTypes, i);
    const year = 2019 + (i % 7);
    const isPending = n === 15;
    owners[id] = isPending ? "usr_demo_researcher" : "usr_demo_editor";
    const authors = [
      { name: `Demo Author ${String.fromCharCode(65 + (i % 6))}`, affiliation: DEMO_INSTITUTE, orcid: null },
      { name: `Demo Author ${String.fromCharCode(66 + (i % 6))}`, affiliation: "Demo University", orcid: null },
      ...(i % 3 === 0 ? [{ name: "Demo Author Z", affiliation: null, orcid: null }] : []),
    ];
    const venue = type === "JOURNAL_ARTICLE" ? "Demo Journal of Polar Studies" : type === "CONFERENCE_PAPER" ? "Demo Polar Science Conference" : null;
    const slug = `demo-paper-${n}-${slugify(topic)}`;
    const doi = `10.5555/oceanx-demo.${n}`;
    const abstract =
      `This is a placeholder abstract for demonstration purposes and describes no real findings. ` +
      `In a real record this section would summarise the aims, methods and conclusions of a study on ${topic}. ` +
      `${DEMO_NOTICE} Additional placeholder sentences make the abstract long enough to test text truncation in list views and cards across breakpoints.`;
    const pdf = i % 2 === 0 ? mkFile(40 + n, `${slug}.pdf`, "application/pdf", 850_000 + n * 12_345, "PUBLICATION_PDF", i % 4 === 2 ? "REGISTERED" : "OPEN") : null;
    const title = `Demo Paper ${n}: Placeholder Study on ${topic[0].toUpperCase()}${topic.slice(1)}`;
    return {
      id,
      slug,
      title,
      abstractPreview: abstract.slice(0, 220).replace(/\s+\S*$/, "") + "…",
      authors,
      type,
      year,
      venue,
      doi,
      region: pick(regions, i),
      accessLevel: pdf?.accessLevel ?? "OPEN",
      hasFullText: Boolean(pdf),
      categories: [cat(pick(pubCats, i))],
      keywords: [pick(keywordLabels, i), pick(keywordLabels, i + 5)],
      status: isPending ? "PENDING_REVIEW" : "PUBLISHED",
      publishedAt: isPending ? null : `${year}-${pad((i % 12) + 1)}-10T09:00:00.000Z`,
      createdAt: `${year}-${pad((i % 12) + 1)}-01T09:00:00.000Z`,
      updatedAt: STATIC_TS,
      abstract,
      publicationDate: `${year}-${pad((i % 12) + 1)}-01`,
      volume: venue ? String(10 + (i % 5)) : null,
      issue: venue ? String((i % 4) + 1) : null,
      pages: venue ? `${100 + i * 7}–${112 + i * 7}` : null,
      publisher: type === "REPORT" || type === "TECHNICAL_NOTE" ? DEMO_INSTITUTE : null,
      externalUrl: `https://example.org/demo/publications/${n}`,
      pdf: pdf ? fileRef(pdf) : null,
      expedition: expRef(pick(pubExpeditions, i)),
      datasets: [],
      citation: formatCitation({ title, authors, year, venue, volume: venue ? String(10 + (i % 5)) : null, issue: venue ? String((i % 4) + 1) : null, pages: venue ? `${100 + i * 7}–${112 + i * 7}` : null, doi, slug, kind: "publication" }),
      aiSummary: null,
    };
  });

  // ─── Datasets ───────────────────────────────────────────────────────────
  const datasetDefs: { topic: string; region: PolarRegion; params: string[]; formats: string[]; access: Dataset["accessLevel"]; exp: string | null; cats: string[] }[] = [
    { topic: "Coastal Ice Elevation Points", region: "ANTARCTICA", params: ["Surface elevation", "GNSS position"], formats: ["CSV", "GeoJSON"], access: "OPEN", exp: "exp_demo_01", cats: ["cat_glaciology", "cat_remote_sensing"] },
    { topic: "Ocean Temperature and Salinity Profiles", region: "SOUTHERN_OCEAN", params: ["Sea water temperature", "Salinity", "Pressure"], formats: ["NetCDF"], access: "OPEN", exp: "exp_demo_02", cats: ["cat_oceanography"] },
    { topic: "Fjord Chlorophyll Samples", region: "ARCTIC", params: ["Chlorophyll-a", "Depth"], formats: ["CSV"], access: "REGISTERED", exp: "exp_demo_03", cats: ["cat_ocean_biology"] },
    { topic: "Glacier Ablation Stake Readings", region: "HIMALAYA", params: ["Ablation", "Snow depth"], formats: ["CSV", "XLSX"], access: "OPEN", exp: "exp_demo_04", cats: ["cat_glaciology", "cat_climate"] },
    { topic: "Automatic Weather Station Records", region: "ANTARCTICA", params: ["Air temperature", "Wind speed", "Relative humidity"], formats: ["CSV", "NetCDF"], access: "OPEN", exp: "exp_demo_05", cats: ["cat_atmospheric"] },
    { topic: "Aerosol Optical Depth Series", region: "ANTARCTICA", params: ["Aerosol optical depth"], formats: ["NetCDF"], access: "REGISTERED", exp: "exp_demo_05", cats: ["cat_atmospheric", "cat_climate"] },
    { topic: "Ice Shelf Front Positions", region: "ANTARCTICA", params: ["Ice front position"], formats: ["GeoJSON", "Shapefile"], access: "OPEN", exp: "exp_demo_07", cats: ["cat_remote_sensing"] },
    { topic: "Seabed Depth Soundings", region: "ANTARCTICA", params: ["Water depth"], formats: ["GeoTIFF"], access: "RESTRICTED", exp: "exp_demo_07", cats: ["cat_geology"] },
    { topic: "Snow Cover Classification Tiles", region: "HIMALAYA", params: ["Snow cover fraction"], formats: ["GeoTIFF"], access: "OPEN", exp: null, cats: ["cat_remote_sensing", "cat_climate"] },
    { topic: "Sea Ice Concentration Grids", region: "ARCTIC", params: ["Sea ice concentration"], formats: ["NetCDF"], access: "OPEN", exp: null, cats: ["cat_sea_ice", "cat_remote_sensing"] },
  ];
  const bbox: Record<PolarRegion, { west: number; south: number; east: number; north: number }> = {
    ANTARCTICA: { west: 0, south: -72, east: 80, north: -65 },
    ARCTIC: { west: 5, south: 76, east: 30, north: 81 },
    SOUTHERN_OCEAN: { west: 40, south: -60, east: 80, north: -45 },
    HIMALAYA: { west: 76, south: 30, east: 80, north: 33 },
  };
  const datasets: Dataset[] = datasetDefs.map((d, i) => {
    const n = i + 1;
    const id = `ds_demo_${pad(n)}`;
    owners[id] = "usr_demo_researcher";
    const slug = `demo-${slugify(d.topic)}`;
    const dsFiles = d.formats.map((fmt, j) =>
      mkFile(
        n * 2 + j - 1,
        `${slug}${j ? `-part${j + 1}` : ""}.${fmt.toLowerCase().replace("netcdf", "nc").replace("geotiff", "tif").replace("shapefile", "zip")}`,
        fmt === "CSV" ? "text/csv" : fmt === "NetCDF" ? "application/x-netcdf" : fmt === "GeoJSON" ? "application/geo+json" : fmt === "GeoTIFF" ? "image/tiff" : "application/zip",
        (n + j) * 3_250_000,
        "DATASET_FILE",
        d.access,
      ),
    );
    const startYear = 2018 + (i % 5);
    const title = `Demo Dataset: ${d.topic}`;
    const version = `1.${i % 3}`;
    const doi = `10.5555/oceanx-demo-data.${n}`;
    return {
      id,
      slug,
      title,
      summary: `Placeholder dataset of ${d.topic.toLowerCase()} for demonstrating the repository UI. Contains no real measurements.`,
      region: d.region,
      parameters: d.params,
      formats: d.formats,
      temporalCoverage: { start: `${startYear}-01-01`, end: n % 4 === 0 ? null : `${startYear + 2}-12-31` },
      accessLevel: d.access,
      license: d.access === "RESTRICTED" ? "Custom (restricted)" : "CC-BY-4.0",
      doi,
      version,
      fileCount: dsFiles.length,
      totalSizeBytes: dsFiles.reduce((s, f) => s + f.sizeBytes, 0),
      downloadCount: 25 + ((n * 53) % 900),
      categories: d.cats.map(cat),
      keywords: [pick(keywordLabels, i * 2), pick(keywordLabels, i * 2 + 1)],
      status: "PUBLISHED",
      publishedAt: `${startYear + 3}-0${(n % 9) + 1}-20T09:00:00.000Z`,
      createdAt: `${startYear + 3}-0${(n % 9) + 1}-01T09:00:00.000Z`,
      updatedAt: STATIC_TS,
      description: `## Demo dataset\n\n${DEMO_NOTICE}\n\nIn a real record this section would document methods, instruments, processing levels and quality flags.`,
      spatialCoverage: bbox[d.region],
      files: dsFiles.map(fileRef),
      expedition: expRef(d.exp),
      relatedPublications: [],
      contact: { name: "Demo Data Custodian", email: "data@demo.oceanx.local", organization: DEMO_INSTITUTE },
      citation: formatCitation({ title, authors: [{ name: "Demo Researcher" }], year: startYear + 3, version, publisher: DEMO_INSTITUTE, doi, slug, kind: "dataset" }),
    };
  });

  // Cross-link publications ⇄ datasets (same expedition).
  for (const p of publications) {
    if (!p.expedition) continue;
    const linked = datasets.filter((d) => d.expedition?.id === p.expedition!.id).slice(0, 2);
    p.datasets = linked.map((d) => ({ id: d.id, slug: d.slug, title: d.title }));
    for (const d of linked) {
      if (p.status === "PUBLISHED" && !d.relatedPublications.some((r) => r.id === p.id)) {
        d.relatedPublications.push({ id: p.id, slug: p.slug, title: p.title, year: p.year });
      }
    }
  }

  // ─── Media ──────────────────────────────────────────────────────────────
  const mediaSubjects = [
    "Ice edge at dawn", "Research vessel deck", "Weather balloon launch", "Glacier snout", "Field camp tents",
    "Penguin colony (placeholder)", "Sea ice floes", "Ice core storage", "Mountain glacier panorama", "Snow pit profile",
    "Station at night", "Fjord landscape", "Instrument mast", "Sampling on the ice", "Aurora (placeholder)",
    "Expedition video briefing", "Time-lapse of clouds", "Underwater camera test", "Field interview audio", "Station brochure",
  ];
  const mediaExp = ["exp_demo_01", "exp_demo_02", "exp_demo_05", "exp_demo_04", "exp_demo_03", "exp_demo_07", null];
  const media: MediaAsset[] = mediaSubjects.map((subject, i) => {
    const n = i + 1;
    const id = `med_demo_${pad(n)}`;
    owners[id] = "usr_demo_researcher";
    const type: MediaAsset["type"] = n >= 16 && n <= 18 ? "VIDEO" : n === 19 ? "AUDIO" : n === 20 ? "DOCUMENT" : "IMAGE";
    const thumb = `/demo/polar-${((n - 1) % 6) + 1}.svg`;
    const expId = pick(mediaExp, i);
    const exp = expId ? expeditions.find((e) => e.id === expId)! : null;
    return {
      id,
      slug: `demo-${slugify(subject)}`,
      title: `Demo Media: ${subject}`,
      type,
      url: type === "IMAGE" ? thumb : `https://example.org/demo/media/${n}`,
      thumbnailUrl: thumb,
      altText: `Placeholder graphic standing in for: ${subject.toLowerCase()}`,
      width: type === "IMAGE" || type === "VIDEO" ? 1600 : null,
      height: type === "IMAGE" || type === "VIDEO" ? 900 : null,
      durationSeconds: type === "VIDEO" ? 60 + n * 10 : type === "AUDIO" ? 300 : null,
      region: exp?.region ?? pick(regions, i),
      credit: "Demo placeholder",
      license: "CC-BY-4.0",
      capturedAt: `202${3 + (i % 3)}-${pad((i % 12) + 1)}-0${(i % 9) + 1}`,
      featured: n <= 8,
      status: "PUBLISHED",
      publishedAt: `2025-${pad((i % 12) + 1)}-12T09:00:00.000Z`,
      createdAt: `2025-${pad((i % 12) + 1)}-01T09:00:00.000Z`,
      updatedAt: STATIC_TS,
      description: `Placeholder caption. ${DEMO_NOTICE}`,
      embedUrl: null,
      expedition: expRef(expId),
      location: exp?.location ?? null,
      categories: exp ? exp.categories.slice(0, 1) : [cat("cat_climate")],
      keywords: exp ? exp.keywords.slice(0, 2) : ["outreach"],
    };
  });

  // ─── Activities ─────────────────────────────────────────────────────────
  const activityDefs: { type: InstitutionalActivity["type"]; title: string; startDays: number | null; hours?: number; online?: boolean; location?: string; publishedDays: number }[] = [
    { type: "NEWS", title: "Portal Launch Announcement (Demo)", startDays: null, publishedDays: -5 },
    { type: "EVENT", title: "Public Lecture on Polar Science (Demo)", startDays: 14, hours: 2, location: "Demo Auditorium, Demo City", publishedDays: -10 },
    { type: "WORKSHOP", title: "Data Repository Training Workshop (Demo)", startDays: 30, hours: 6, online: true, publishedDays: -3 },
    { type: "PRESS_RELEASE", title: "Expedition Team Departs (Demo Press Release)", startDays: null, publishedDays: -20 },
    { type: "OUTREACH_PROGRAM", title: "School Outreach Programme (Demo)", startDays: 45, hours: 3, location: "Demo School, Demo City", publishedDays: -15 },
    { type: "EVENT", title: "Photo Exhibition Opening (Demo)", startDays: -30, hours: 4, location: "Demo Gallery", publishedDays: -60 },
    { type: "NEWS", title: "New Datasets Added to the Repository (Demo)", startDays: null, publishedDays: -25 },
    { type: "ANNOUNCEMENT", title: "Call for Outreach Volunteers (Demo)", startDays: null, publishedDays: -8 },
    { type: "EVENT", title: "Online Q&A with Researchers (Demo)", startDays: 7, hours: 1, online: true, publishedDays: -2 },
    { type: "NEWS", title: "Archived Newsletter Item (Demo)", startDays: null, publishedDays: -120 },
  ];
  const activities: InstitutionalActivity[] = activityDefs.map((d, i) => {
    const n = i + 1;
    const id = `act_demo_${pad(n)}`;
    owners[id] = "usr_demo_editor";
    const startsAt = d.startDays === null ? null : rel(d.startDays);
    const endsAt = d.startDays === null ? null : new Date(new Date(startsAt!).getTime() + (d.hours ?? 1) * 3_600_000).toISOString();
    const attachment = n === 3 ? mkFile(80, "demo-workshop-agenda.pdf", "application/pdf", 210_000, "ATTACHMENT", "OPEN") : null;
    return {
      id,
      slug: slugify(d.title),
      type: d.type,
      title: d.title,
      summary: `Placeholder summary for this demo news/activity item. ${DEMO_NOTICE}`,
      coverImage: image(n + 2, `Placeholder banner for ${d.title}`),
      startsAt,
      endsAt,
      location: d.online ? "Online" : (d.location ?? null),
      isOnline: Boolean(d.online),
      region: n % 3 === 0 ? "ANTARCTICA" : null,
      categories: [cat(n % 2 ? "cat_logistics" : "cat_climate")],
      status: "PUBLISHED",
      publishedAt: rel(d.publishedDays, 9),
      createdAt: rel(d.publishedDays - 2, 9),
      updatedAt: rel(d.publishedDays, 9),
      body: `## ${d.title}\n\n${DEMO_NOTICE}\n\nPlaceholder body text for the news/event detail page.`,
      registrationUrl: startsAt && d.startDays! > 0 ? `https://example.org/demo/register/${n}` : null,
      externalUrl: null,
      attachments: attachment ? [fileRef(attachment)] : [],
      keywords: ["outreach"],
    };
  });

  // An uploaded file not attached to any record (e.g. abandoned draft upload).
  mkFile(90, "demo-unattached-figure.png", "image/png", 482_113, "COVER_IMAGE", "OPEN");

  // ─── AI-assisted outreach content ───────────────────────────────────────
  const aiSource = (type: "EXPEDITION" | "PUBLICATION" | "DATASET", id: string) => {
    const rec = (type === "EXPEDITION" ? expeditions : type === "PUBLICATION" ? publications : datasets).find((r) => r.id === id)!;
    return { type, id: rec.id, slug: rec.slug, title: rec.title };
  };
  const mkAI = (
    n: number,
    kind: AIOutreachContent["kind"],
    title: string,
    status: AIOutreachContent["status"],
    audience: AIOutreachContent["audience"],
    sources: AIOutreachContent["sources"],
  ): AIOutreachContent => ({
    id: `ai_demo_${pad(n)}`,
    slug: `demo-${slugify(title)}`,
    kind,
    title,
    body: `**Demo AI-assisted text.** ${DEMO_NOTICE}\n\nThis placeholder stands in for a ${kind.toLowerCase().replace("_", " ")} written for ${audience.toLowerCase().replace("_", " ")}.`,
    audience,
    language: "en",
    sources,
    status,
    isAIGenerated: true,
    disclaimer: AI_DISCLAIMER,
    model: "claude-opus-5-5",
    generatedBy: summaryOf("usr_demo_editor"),
    reviewedBy: status === "PUBLISHED" ? summaryOf("usr_demo_admin") : null,
    reviewedAt: status === "PUBLISHED" ? STATIC_TS : null,
    publishedAt: status === "PUBLISHED" ? STATIC_TS : null,
    createdAt: "2025-05-20T08:00:00.000Z",
    updatedAt: STATIC_TS,
  });
  const aiContent: AIOutreachContent[] = [
    mkAI(1, "EXPLAINER", "Demo Explainer: What Happens on a Coastal Ice Survey?", "PUBLISHED", "STUDENTS", [aiSource("EXPEDITION", "exp_demo_01")]),
    mkAI(2, "SOCIAL_POST", "Demo Social Post: Transect Data Now Online", "DRAFT", "GENERAL_PUBLIC", [aiSource("DATASET", "ds_demo_02")]),
    mkAI(3, "RESEARCH_SUMMARY", "Demo Summary: Placeholder Study on Sea Ice Variability", "PUBLISHED", "GENERAL_PUBLIC", [aiSource("PUBLICATION", "pub_demo_01")]),
    mkAI(4, "QUIZ", "Demo Quiz: Polar Regions Basics", "PUBLISHED", "STUDENTS", [aiSource("EXPEDITION", "exp_demo_04"), aiSource("EXPEDITION", "exp_demo_03")]),
  ];
  const summaryItem = aiContent[2];
  publications[0].aiSummary = {
    id: summaryItem.id,
    text: summaryItem.body,
    audience: summaryItem.audience,
    language: summaryItem.language,
    model: summaryItem.model,
    reviewedAt: summaryItem.reviewedAt,
    disclaimer: summaryItem.disclaimer,
  };

  // Drafts / pending records for workflow demos.
  const pendingMedia: MediaAsset = {
    ...media[0],
    id: "med_demo_21",
    slug: "demo-pending-upload",
    title: "Demo Media: Pending Upload",
    featured: false,
    status: "PENDING_REVIEW",
    publishedAt: null,
  };
  media.push(pendingMedia);
  owners[pendingMedia.id] = "usr_demo_researcher";

  // ─── Submissions ────────────────────────────────────────────────────────
  const researcher = summaryOf("usr_demo_researcher");
  const submissions: Submission[] = [
    {
      id: "sub_demo_01",
      contentType: "PUBLICATION",
      contentId: "pub_demo_15",
      contentTitle: publications[14].title,
      contentSlug: publications[14].slug,
      status: "PENDING",
      message: "Demo submission awaiting review.",
      submittedBy: researcher,
      submittedAt: "2025-06-02T10:00:00.000Z",
      reviewedBy: null,
      reviewedAt: null,
      reviewComment: null,
      history: [{ id: "rev_demo_01", action: "SUBMITTED", actor: researcher, comment: "Demo submission awaiting review.", createdAt: "2025-06-02T10:00:00.000Z" }],
    },
    {
      id: "sub_demo_02",
      contentType: "MEDIA",
      contentId: "med_demo_21",
      contentTitle: pendingMedia.title,
      contentSlug: pendingMedia.slug,
      status: "PENDING",
      message: null,
      submittedBy: researcher,
      submittedAt: "2025-06-03T10:00:00.000Z",
      reviewedBy: null,
      reviewedAt: null,
      reviewComment: null,
      history: [{ id: "rev_demo_02", action: "SUBMITTED", actor: researcher, comment: null, createdAt: "2025-06-03T10:00:00.000Z" }],
    },
    {
      id: "sub_demo_03",
      contentType: "EXPEDITION",
      contentId: "exp_demo_01",
      contentTitle: expeditions[0].title,
      contentSlug: expeditions[0].slug,
      status: "APPROVED",
      message: "Initial publication.",
      submittedBy: summaryOf("usr_demo_editor"),
      submittedAt: "2025-01-20T10:00:00.000Z",
      reviewedBy: summaryOf("usr_demo_admin"),
      reviewedAt: "2025-01-21T10:00:00.000Z",
      reviewComment: "Approved (demo).",
      history: [
        { id: "rev_demo_03", action: "SUBMITTED", actor: summaryOf("usr_demo_editor"), comment: "Initial publication.", createdAt: "2025-01-20T10:00:00.000Z" },
        { id: "rev_demo_04", action: "APPROVED", actor: summaryOf("usr_demo_admin"), comment: "Approved (demo).", createdAt: "2025-01-21T10:00:00.000Z" },
      ],
    },
  ];

  // ─── Audit log ──────────────────────────────────────────────────────────
  const auditLogs: AuditLogEntry[] = [
    { id: "aud_demo_01", actor: summaryOf("usr_demo_admin"), action: "auth.login", entityType: "User", entityId: "usr_demo_admin", metadata: null, ipAddress: "127.0.0.1", createdAt: "2025-06-03T08:00:00.000Z" },
    { id: "aud_demo_02", actor: summaryOf("usr_demo_admin"), action: "submission.approve", entityType: "Submission", entityId: "sub_demo_03", metadata: { contentType: "EXPEDITION" }, ipAddress: "127.0.0.1", createdAt: "2025-01-21T10:00:00.000Z" },
    { id: "aud_demo_03", actor: summaryOf("usr_demo_editor"), action: "publication.update", entityType: "Publication", entityId: "pub_demo_02", metadata: { fields: ["venue"] }, ipAddress: "127.0.0.1", createdAt: "2025-05-30T12:00:00.000Z" },
  ];

  // ─── Derived counts ─────────────────────────────────────────────────────
  const published = <T extends { status: string }>(xs: T[]) => xs.filter((x) => x.status === "PUBLISHED");
  for (const k of keywords) {
    const has = (xs: { keywords: string[]; status: string }[]) => published(xs).filter((x) => x.keywords.includes(k.label)).length;
    k.usageCount = has(expeditions) + has(publications) + has(datasets) + has(media) + has(activities);
  }
  keywords.sort((a, b) => b.usageCount - a.usageCount || a.label.localeCompare(b.label));

  return {
    users,
    passwords,
    categories,
    keywords,
    files,
    expeditions,
    publications,
    datasets,
    media,
    activities,
    aiContent,
    submissions,
    auditLogs,
    owners,
  };
}
