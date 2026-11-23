import { E, IdOrSlugParams, IdParams, PAGES, defineEndpoint, publicListErrors, writeErrors } from "../endpoint";
import { DeletedSchema, paginatedResponse, successResponse } from "../primitives";
import { CONTRIBUTOR_ROLES, STAFF_ROLES } from "../schemas/roles";
import {
  CreateExpeditionRequestSchema,
  ExpeditionSchema,
  ExpeditionSummarySchema,
  ListExpeditionsQuerySchema,
  UpdateExpeditionRequestSchema,
} from "../schemas/expeditions";
import {
  CreatePublicationRequestSchema,
  ListPublicationsQuerySchema,
  PublicationSchema,
  PublicationSummarySchema,
  UpdatePublicationRequestSchema,
} from "../schemas/publications";
import {
  CreateDatasetRequestSchema,
  DatasetSchema,
  DatasetSummarySchema,
  ListDatasetsQuerySchema,
  UpdateDatasetRequestSchema,
} from "../schemas/datasets";
import {
  CreateMediaAssetRequestSchema,
  ListMediaQuerySchema,
  MediaAssetSchema,
  MediaAssetSummarySchema,
  UpdateMediaAssetRequestSchema,
} from "../schemas/media";
import {
  ActivitySummarySchema,
  CreateActivityRequestSchema,
  InstitutionalActivitySchema,
  ListActivitiesQuerySchema,
  UpdateActivityRequestSchema,
} from "../schemas/activities";

// ─── Shared wording ─────────────────────────────────────────────────────────

const LIST_CACHING =
  "Public, shareable data; ~1 min staleness is fine. See §3.8. " +
  "Do not cache responses fetched with a staff session (`status` filter).";
const DETAIL_CACHING = "Public, shareable data; 1–5 min staleness is fine. Drafts fetched with a staff/owner session must not be cached or shared. See §3.8.";
const PAGINATION_NOTE =
  "Pagination: send `page`/`limit`; render pages from `pagination.totalPages`, and use `hasNextPage` for “Load more”.";
const FILTER_NOTE =
  "Filtering: mirror filters in the URL query string (e.g. `/expeditions?region=ARCTIC&page=2`) so results are shareable; reset `page` to 1 when a filter changes.";
const LOADING_NOTE = "Loading: show skeleton cards matching `limit`; on error show a retry button; when `data` is empty show an empty state, not an error.";
const DETAIL_NOTES = [
  "Accepts the slug from the page URL directly — no need to look up the ID first.",
  "On 404 render the Next.js `notFound()` page.",
  "Body fields are Markdown: render with a Markdown renderer that sanitises HTML.",
] as const;
const CREATE_DESC =
  "Creates a record in `DRAFT` status owned by the caller. Researchers then request publication with " +
  "`POST /submissions`; EDITOR/ADMIN may publish directly with `PATCH … { status: \"PUBLISHED\" }`.";
const UPDATE_DESC =
  "Partial update. The owner may edit while the record is `DRAFT` or `CHANGES_REQUESTED`; EDITOR/ADMIN may edit any " +
  "time and may set `status` directly. Keyword labels and category IDs replace the existing set when provided.";
const DELETE_DESC =
  "Archives (soft-deletes) the record: it disappears from public endpoints and search. EDITOR/ADMIN, or the owner of a `DRAFT`.";
const OWNER_OR_STAFF = "Only the owner (while DRAFT/CHANGES_REQUESTED) or EDITOR/ADMIN may do this, or disallowed Origin.";
const ADMIN_CONTENT = {
  owner: "backend-admin",
  caching: "Never cache. After success, refresh affected views (`router.refresh()`).",
} as const;

// ─── Expeditions ────────────────────────────────────────────────────────────

export const expeditionEndpoints = {
  listExpeditions: defineEndpoint({
    operationId: "listExpeditions",
    method: "GET",
    path: "/expeditions",
    tag: "Expeditions",
    summary: "List expeditions",
    description: "Paginated list of PUBLISHED expeditions with filters for region, phase, year, category and keyword.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { query: ListExpeditionsQuerySchema },
    response: { status: 200, description: "Expeditions.", schema: paginatedResponse(ExpeditionSummarySchema) },
    errors: publicListErrors,
    frontend: {
      pages: [PAGES.expeditions, PAGES.topics],
      owner: "public-frontend",
      when: "On page load and whenever filters, sort or page change.",
      caching: LIST_CACHING,
      notes: [PAGINATION_NOTE, FILTER_NOTE, LOADING_NOTE, "Map view: request `limit=100` and plot `location` from the detail endpoint, or group cards by `region`."],
    },
    client: { module: "expeditions", fn: "getExpeditions" },
    example: { query: { region: "ANTARCTICA", page: 1, limit: 12 } },
  }),

  getExpedition: defineEndpoint({
    operationId: "getExpedition",
    method: "GET",
    path: "/expeditions/{id}",
    tag: "Expeditions",
    summary: "Get an expedition",
    description:
      "Full expedition record by ID or slug, including counts of related publications, datasets and media. " +
      "Non-published records are visible only to their owner and EDITOR/ADMIN.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { params: IdOrSlugParams },
    response: { status: 200, description: "Expedition.", schema: successResponse(ExpeditionSchema) },
    errors: { 404: "No published expedition with this ID/slug (or not visible to you).", 500: E.server },
    frontend: {
      pages: [PAGES.expeditionDetail],
      owner: "public-frontend",
      when: "On detail page load (Server Component), using the slug from the URL.",
      caching: DETAIL_CACHING,
      notes: [
        ...DETAIL_NOTES,
        "Related content: call getPublications/getDatasets/getMediaAssets with `{ expeditionId: expedition.id }` in parallel; hide a section when its count is 0.",
      ],
    },
    client: { module: "expeditions", fn: "getExpedition" },
    example: { params: { id: "demo-antarctic-coastal-ice-survey" } },
  }),

  createExpedition: defineEndpoint({
    operationId: "createExpedition",
    method: "POST",
    path: "/expeditions",
    tag: "Expeditions",
    summary: "Create an expedition",
    description: CREATE_DESC,
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { body: CreateExpeditionRequestSchema },
    response: { status: 201, description: "Created (DRAFT).", schema: successResponse(ExpeditionSchema) },
    errors: { ...writeErrors, 409: "Slug already in use (`details.reason = SLUG_TAKEN`)." },
    frontend: { pages: [PAGES.adminContent, PAGES.contributor], when: "On create form submit.", ...ADMIN_CONTENT },
    client: { module: "expeditions", fn: "createExpedition" },
    example: {
      body: {
        title: "Demo Expedition: Sea Ice Thickness Pilot",
        summary: "Demonstration record created through the API.",
        description: "Placeholder description used to demonstrate the create endpoint.",
        region: "ARCTIC",
        year: 2026,
        categoryIds: ["cat_sea_ice"],
        keywords: ["sea ice"],
      },
    },
  }),

  updateExpedition: defineEndpoint({
    operationId: "updateExpedition",
    method: "PATCH",
    path: "/expeditions/{id}",
    tag: "Expeditions",
    summary: "Update an expedition",
    description: UPDATE_DESC,
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { params: IdParams, body: UpdateExpeditionRequestSchema },
    response: { status: 200, description: "Updated.", schema: successResponse(ExpeditionSchema) },
    errors: { ...writeErrors, 403: OWNER_OR_STAFF, 404: "Expedition not found.", 409: "Slug already in use." },
    frontend: { pages: [PAGES.adminContent, PAGES.contributor], when: "On edit form save.", ...ADMIN_CONTENT },
    client: { module: "expeditions", fn: "updateExpedition" },
    example: { params: { id: "exp_demo_01" }, body: { phase: "COMPLETED" } },
  }),

  deleteExpedition: defineEndpoint({
    operationId: "deleteExpedition",
    method: "DELETE",
    path: "/expeditions/{id}",
    tag: "Expeditions",
    summary: "Archive an expedition",
    description: DELETE_DESC,
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { params: IdParams },
    response: { status: 200, description: "Archived.", schema: successResponse(DeletedSchema) },
    errors: { 401: E.unauthenticated, 403: OWNER_OR_STAFF, 404: "Expedition not found.", 500: E.server },
    frontend: { pages: [PAGES.adminContent], when: "After the user confirms deletion.", ...ADMIN_CONTENT },
    client: { module: "expeditions", fn: "deleteExpedition" },
    example: { params: { id: "exp_demo_09" } },
  }),
} as const;

// ─── Publications ───────────────────────────────────────────────────────────

export const publicationEndpoints = {
  listPublications: defineEndpoint({
    operationId: "listPublications",
    method: "GET",
    path: "/publications",
    tag: "Publications",
    summary: "List research publications",
    description: "Paginated list of PUBLISHED publications. Filter by type, year range, region, author, category, keyword or expedition.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { query: ListPublicationsQuerySchema },
    response: { status: 200, description: "Publications.", schema: paginatedResponse(PublicationSummarySchema) },
    errors: publicListErrors,
    frontend: {
      pages: [PAGES.research, PAGES.expeditionDetail, PAGES.topics],
      owner: "public-frontend",
      when: "On page load and on filter/page change. On expedition pages, with `expeditionId`.",
      caching: LIST_CACHING,
      notes: [PAGINATION_NOTE, FILTER_NOTE, LOADING_NOTE, "Debounce the `q`/`author` text inputs (~300 ms) before refetching."],
    },
    client: { module: "publications", fn: "getPublications" },
    example: { query: { type: "JOURNAL_ARTICLE", yearFrom: 2020, page: 1, limit: 10 } },
  }),

  getPublication: defineEndpoint({
    operationId: "getPublication",
    method: "GET",
    path: "/publications/{id}",
    tag: "Publications",
    summary: "Get a publication",
    description: "Full publication by ID or slug: abstract, authors, citation strings, PDF link, linked datasets and approved AI summary.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { params: IdOrSlugParams },
    response: { status: 200, description: "Publication.", schema: successResponse(PublicationSchema) },
    errors: { 404: "No published publication with this ID/slug (or not visible to you).", 500: E.server },
    frontend: {
      pages: [PAGES.publicationDetail],
      owner: "public-frontend",
      when: "On detail page load.",
      caching: DETAIL_CACHING,
      notes: [
        ...DETAIL_NOTES,
        "Show `citation.apa` with a copy button; offer `citation.bibtex` as a download.",
        "If `aiSummary` is present, label it as AI-assisted and always show `aiSummary.disclaimer`.",
        "PDF link: use `pdf.downloadUrl` as a plain `<a href>`; for REGISTERED access prompt login on 401.",
      ],
    },
    client: { module: "publications", fn: "getPublication" },
    example: { params: { id: "pub_demo_01" } },
  }),

  createPublication: defineEndpoint({
    operationId: "createPublication",
    method: "POST",
    path: "/publications",
    tag: "Publications",
    summary: "Create a publication",
    description: CREATE_DESC + " Attach a PDF by uploading it first (`POST /uploads`, purpose `PUBLICATION_PDF`) and passing `pdfFileId`.",
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { body: CreatePublicationRequestSchema },
    response: { status: 201, description: "Created (DRAFT).", schema: successResponse(PublicationSchema) },
    errors: { ...writeErrors, 409: "Slug or DOI already exists (`details.reason = SLUG_TAKEN | DOI_TAKEN`)." },
    frontend: { pages: [PAGES.adminContent, PAGES.contributor], when: "On create form submit.", ...ADMIN_CONTENT },
    client: { module: "publications", fn: "createPublication" },
    example: {
      body: {
        title: "Demo Paper: Placeholder Study Title",
        abstract: "Placeholder abstract used to demonstrate the create endpoint. Not a real study.",
        authors: [{ name: "Demo Author A" }],
        type: "JOURNAL_ARTICLE",
        year: 2026,
      },
    },
  }),

  updatePublication: defineEndpoint({
    operationId: "updatePublication",
    method: "PATCH",
    path: "/publications/{id}",
    tag: "Publications",
    summary: "Update a publication",
    description: UPDATE_DESC,
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { params: IdParams, body: UpdatePublicationRequestSchema },
    response: { status: 200, description: "Updated.", schema: successResponse(PublicationSchema) },
    errors: { ...writeErrors, 403: OWNER_OR_STAFF, 404: "Publication not found.", 409: "Slug or DOI already exists." },
    frontend: { pages: [PAGES.adminContent, PAGES.contributor], when: "On edit form save.", ...ADMIN_CONTENT },
    client: { module: "publications", fn: "updatePublication" },
    example: { params: { id: "pub_demo_01" }, body: { venue: "Demo Journal of Polar Studies" } },
  }),

  deletePublication: defineEndpoint({
    operationId: "deletePublication",
    method: "DELETE",
    path: "/publications/{id}",
    tag: "Publications",
    summary: "Archive a publication",
    description: DELETE_DESC,
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { params: IdParams },
    response: { status: 200, description: "Archived.", schema: successResponse(DeletedSchema) },
    errors: { 401: E.unauthenticated, 403: OWNER_OR_STAFF, 404: "Publication not found.", 500: E.server },
    frontend: { pages: [PAGES.adminContent], when: "After the user confirms deletion.", ...ADMIN_CONTENT },
    client: { module: "publications", fn: "deletePublication" },
    example: { params: { id: "pub_demo_14" } },
  }),
} as const;

// ─── Datasets ───────────────────────────────────────────────────────────────

export const datasetEndpoints = {
  listDatasets: defineEndpoint({
    operationId: "listDatasets",
    method: "GET",
    path: "/datasets",
    tag: "Datasets",
    summary: "List scientific datasets",
    description:
      "Paginated list of PUBLISHED datasets. Filter by region, access level, format, parameter, temporal coverage, category, keyword or expedition.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { query: ListDatasetsQuerySchema },
    response: { status: 200, description: "Datasets.", schema: paginatedResponse(DatasetSummarySchema) },
    errors: publicListErrors,
    frontend: {
      pages: [PAGES.datasets, PAGES.expeditionDetail, PAGES.topics],
      owner: "public-frontend",
      when: "On page load and on filter/page change.",
      caching: LIST_CACHING,
      notes: [
        PAGINATION_NOTE,
        FILTER_NOTE,
        LOADING_NOTE,
        "Show an access badge from `accessLevel` (OPEN / Login required / Restricted).",
        "Format sizes from `totalSizeBytes` on the client (e.g. 1.2 GB).",
      ],
    },
    client: { module: "datasets", fn: "getDatasets" },
    example: { query: { region: "ARCTIC", accessLevel: "OPEN", page: 1, limit: 12 } },
  }),

  getDataset: defineEndpoint({
    operationId: "getDataset",
    method: "GET",
    path: "/datasets/{id}",
    tag: "Datasets",
    summary: "Get a dataset",
    description: "Full dataset by ID or slug: description, coverage, files with download links, citation, related publications.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { params: IdOrSlugParams },
    response: { status: 200, description: "Dataset.", schema: successResponse(DatasetSchema) },
    errors: { 404: "No published dataset with this ID/slug (or not visible to you).", 500: E.server },
    frontend: {
      pages: [PAGES.datasetDetail],
      owner: "public-frontend",
      when: "On detail page load.",
      caching: DETAIL_CACHING,
      notes: [
        ...DETAIL_NOTES,
        "Downloads: render each `files[].downloadUrl` as `<a href download>` — the browser sends the session cookie automatically.",
        "REGISTERED: if the user is logged out, show “Log in to download” instead of the link. RESTRICTED: show `contact` details instead.",
        "Map: draw `spatialCoverage` as a rectangle when present.",
      ],
    },
    client: { module: "datasets", fn: "getDataset" },
    example: { params: { id: "ds_demo_01" } },
  }),

  createDataset: defineEndpoint({
    operationId: "createDataset",
    method: "POST",
    path: "/datasets",
    tag: "Datasets",
    summary: "Create a dataset",
    description: CREATE_DESC + " Upload data files first (`POST /uploads`, purpose `DATASET_FILE`) and pass their `fileIds`.",
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { body: CreateDatasetRequestSchema },
    response: { status: 201, description: "Created (DRAFT).", schema: successResponse(DatasetSchema) },
    errors: { ...writeErrors, 409: "Slug or DOI already exists." },
    frontend: { pages: [PAGES.adminContent, PAGES.contributor], when: "On create form submit (after files are uploaded).", ...ADMIN_CONTENT },
    client: { module: "datasets", fn: "createDataset" },
    example: {
      body: {
        title: "Demo Dataset: Placeholder Temperature Series",
        summary: "Demonstration dataset record created through the API.",
        description: "Placeholder description. Contains no real measurements.",
        region: "ANTARCTICA",
        license: "CC-BY-4.0",
        formats: ["CSV"],
      },
    },
  }),

  updateDataset: defineEndpoint({
    operationId: "updateDataset",
    method: "PATCH",
    path: "/datasets/{id}",
    tag: "Datasets",
    summary: "Update a dataset",
    description: UPDATE_DESC + " `fileIds` replaces the attached file set when provided.",
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { params: IdParams, body: UpdateDatasetRequestSchema },
    response: { status: 200, description: "Updated.", schema: successResponse(DatasetSchema) },
    errors: { ...writeErrors, 403: OWNER_OR_STAFF, 404: "Dataset not found.", 409: "Slug or DOI already exists." },
    frontend: { pages: [PAGES.adminContent, PAGES.contributor], when: "On edit form save.", ...ADMIN_CONTENT },
    client: { module: "datasets", fn: "updateDataset" },
    example: { params: { id: "ds_demo_01" }, body: { version: "1.1" } },
  }),

  deleteDataset: defineEndpoint({
    operationId: "deleteDataset",
    method: "DELETE",
    path: "/datasets/{id}",
    tag: "Datasets",
    summary: "Archive a dataset",
    description: DELETE_DESC,
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { params: IdParams },
    response: { status: 200, description: "Archived.", schema: successResponse(DeletedSchema) },
    errors: { 401: E.unauthenticated, 403: OWNER_OR_STAFF, 404: "Dataset not found.", 500: E.server },
    frontend: { pages: [PAGES.adminContent], when: "After the user confirms deletion.", ...ADMIN_CONTENT },
    client: { module: "datasets", fn: "deleteDataset" },
    example: { params: { id: "ds_demo_10" } },
  }),
} as const;

// ─── Media ──────────────────────────────────────────────────────────────────

export const mediaEndpoints = {
  listMediaAssets: defineEndpoint({
    operationId: "listMediaAssets",
    method: "GET",
    path: "/media",
    tag: "Media",
    summary: "List media assets",
    description: "Paginated gallery of PUBLISHED images, videos, audio and documents. Default page size 24.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { query: ListMediaQuerySchema },
    response: { status: 200, description: "Media assets.", schema: paginatedResponse(MediaAssetSummarySchema) },
    errors: publicListErrors,
    frontend: {
      pages: [PAGES.gallery, PAGES.expeditionDetail, PAGES.home],
      owner: "public-frontend",
      when: "On gallery load, filter change, and “Load more” (next page).",
      caching: LIST_CACHING,
      notes: [
        PAGINATION_NOTE,
        FILTER_NOTE,
        "Grid: use `thumbnailUrl` + `altText`; open `url` (or `embedUrl` for VIDEO) in a lightbox.",
        "Use `width`/`height` to reserve space and avoid layout shift.",
      ],
    },
    client: { module: "media", fn: "getMediaAssets" },
    example: { query: { type: "IMAGE", region: "ANTARCTICA", page: 1, limit: 24 } },
  }),

  getMediaAsset: defineEndpoint({
    operationId: "getMediaAsset",
    method: "GET",
    path: "/media/{id}",
    tag: "Media",
    summary: "Get a media asset",
    description: "Full media record by ID or slug, including caption, credit, licence, location and expedition.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { params: IdOrSlugParams },
    response: { status: 200, description: "Media asset.", schema: successResponse(MediaAssetSchema) },
    errors: { 404: "No published media asset with this ID/slug.", 500: E.server },
    frontend: {
      pages: [PAGES.mediaDetail],
      owner: "public-frontend",
      when: "On media detail page load or when a lightbox opens with a shareable URL.",
      caching: DETAIL_CACHING,
      notes: [...DETAIL_NOTES, "Always display `credit` and `license` with the asset."],
    },
    client: { module: "media", fn: "getMediaAsset" },
    example: { params: { id: "med_demo_01" } },
  }),

  createMediaAsset: defineEndpoint({
    operationId: "createMediaAsset",
    method: "POST",
    path: "/media",
    tag: "Media",
    summary: "Create a media asset",
    description: CREATE_DESC + " Upload the file first (`POST /uploads`, purpose `MEDIA`) or provide `externalUrl`.",
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { body: CreateMediaAssetRequestSchema },
    response: { status: 201, description: "Created (DRAFT).", schema: successResponse(MediaAssetSchema) },
    errors: { ...writeErrors, 404: "Referenced file not found.", 409: "Slug already in use." },
    frontend: { pages: [PAGES.adminContent, PAGES.contributor], when: "On create form submit (after upload).", ...ADMIN_CONTENT },
    client: { module: "media", fn: "createMediaAsset" },
    example: {
      body: {
        title: "Demo Photo: Placeholder Ice Edge",
        type: "IMAGE",
        externalUrl: "https://example.org/demo/photo.jpg",
        altText: "Placeholder image of an ice edge",
        region: "ARCTIC",
      },
    },
  }),

  updateMediaAsset: defineEndpoint({
    operationId: "updateMediaAsset",
    method: "PATCH",
    path: "/media/{id}",
    tag: "Media",
    summary: "Update a media asset",
    description: UPDATE_DESC + " Only EDITOR/ADMIN may set `featured`.",
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { params: IdParams, body: UpdateMediaAssetRequestSchema },
    response: { status: 200, description: "Updated.", schema: successResponse(MediaAssetSchema) },
    errors: { ...writeErrors, 403: OWNER_OR_STAFF, 404: "Media asset not found.", 409: "Slug already in use." },
    frontend: { pages: [PAGES.adminContent, PAGES.contributor], when: "On edit form save.", ...ADMIN_CONTENT },
    client: { module: "media", fn: "updateMediaAsset" },
    example: { params: { id: "med_demo_01" }, body: { featured: true } },
  }),

  deleteMediaAsset: defineEndpoint({
    operationId: "deleteMediaAsset",
    method: "DELETE",
    path: "/media/{id}",
    tag: "Media",
    summary: "Archive a media asset",
    description: DELETE_DESC,
    status: "PLANNED",
    auth: "REQUIRED",
    roles: CONTRIBUTOR_ROLES,
    request: { params: IdParams },
    response: { status: 200, description: "Archived.", schema: successResponse(DeletedSchema) },
    errors: { 401: E.unauthenticated, 403: OWNER_OR_STAFF, 404: "Media asset not found.", 500: E.server },
    frontend: { pages: [PAGES.adminContent], when: "After the user confirms deletion.", ...ADMIN_CONTENT },
    client: { module: "media", fn: "deleteMediaAsset" },
    example: { params: { id: "med_demo_20" } },
  }),
} as const;

// ─── Institutional news & activities ────────────────────────────────────────

export const activityEndpoints = {
  listActivities: defineEndpoint({
    operationId: "listActivities",
    method: "GET",
    path: "/activities",
    tag: "Activities",
    summary: "List news and activities",
    description:
      "Paginated list of PUBLISHED institutional news, events, press releases, outreach programmes, workshops and announcements. " +
      "Use `upcoming=true` for an events calendar.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { query: ListActivitiesQuerySchema },
    response: { status: 200, description: "Activities.", schema: paginatedResponse(ActivitySummarySchema) },
    errors: publicListErrors,
    frontend: {
      pages: [PAGES.news, PAGES.home],
      owner: "public-frontend",
      when: "On page load and on tab/filter/page change (e.g. tabs for News | Events | Press).",
      caching: LIST_CACHING,
      notes: [
        PAGINATION_NOTE,
        FILTER_NOTE,
        LOADING_NOTE,
        "Dates are UTC ISO strings: format in the user's locale (`Intl.DateTimeFormat`), show `startsAt` for events and `publishedAt` for news.",
      ],
    },
    client: { module: "activities", fn: "getActivities" },
    example: { query: { type: "EVENT", upcoming: true, page: 1, limit: 6 } },
  }),

  getActivity: defineEndpoint({
    operationId: "getActivity",
    method: "GET",
    path: "/activities/{id}",
    tag: "Activities",
    summary: "Get a news item or activity",
    description: "Full news/event record by ID or slug with Markdown body and attachments.",
    status: "IMPLEMENTED",
    auth: "OPTIONAL",
    request: { params: IdOrSlugParams },
    response: { status: 200, description: "Activity.", schema: successResponse(InstitutionalActivitySchema) },
    errors: { 404: "No published activity with this ID/slug.", 500: E.server },
    frontend: {
      pages: [PAGES.newsDetail],
      owner: "public-frontend",
      when: "On detail page load.",
      caching: DETAIL_CACHING,
      notes: [...DETAIL_NOTES, "Show a “Register” button when `registrationUrl` is set and the event has not ended."],
    },
    client: { module: "activities", fn: "getActivity" },
    example: { params: { id: "act_demo_01" } },
  }),

  createActivity: defineEndpoint({
    operationId: "createActivity",
    method: "POST",
    path: "/activities",
    tag: "Activities",
    summary: "Create a news item or activity",
    description: "Creates a DRAFT news/activity record. Institutional communications are staff-only.",
    status: "PLANNED",
    auth: "REQUIRED",
    roles: STAFF_ROLES,
    request: { body: CreateActivityRequestSchema },
    response: { status: 201, description: "Created (DRAFT).", schema: successResponse(InstitutionalActivitySchema) },
    errors: { ...writeErrors, 409: "Slug already in use." },
    frontend: { pages: [PAGES.adminContent], when: "On create form submit.", ...ADMIN_CONTENT },
    client: { module: "activities", fn: "createActivity" },
    example: {
      body: {
        type: "EVENT",
        title: "Demo Event: Public Lecture Placeholder",
        summary: "Demonstration event created through the API.",
        body: "Placeholder event description.",
        startsAt: "2026-12-10T10:00:00.000Z",
        endsAt: "2026-12-10T12:00:00.000Z",
        isOnline: true,
      },
    },
  }),

  updateActivity: defineEndpoint({
    operationId: "updateActivity",
    method: "PATCH",
    path: "/activities/{id}",
    tag: "Activities",
    summary: "Update a news item or activity",
    description: "Partial update; EDITOR/ADMIN may also set `status` directly (e.g. PUBLISHED).",
    status: "PLANNED",
    auth: "REQUIRED",
    roles: STAFF_ROLES,
    request: { params: IdParams, body: UpdateActivityRequestSchema },
    response: { status: 200, description: "Updated.", schema: successResponse(InstitutionalActivitySchema) },
    errors: { ...writeErrors, 404: "Activity not found.", 409: "Slug already in use." },
    frontend: { pages: [PAGES.adminContent], when: "On edit form save.", ...ADMIN_CONTENT },
    client: { module: "activities", fn: "updateActivity" },
    example: { params: { id: "act_demo_01" }, body: { status: "PUBLISHED" } },
  }),

  deleteActivity: defineEndpoint({
    operationId: "deleteActivity",
    method: "DELETE",
    path: "/activities/{id}",
    tag: "Activities",
    summary: "Archive a news item or activity",
    description: "Archives the record (soft delete).",
    status: "PLANNED",
    auth: "REQUIRED",
    roles: STAFF_ROLES,
    request: { params: IdParams },
    response: { status: 200, description: "Archived.", schema: successResponse(DeletedSchema) },
    errors: { 401: E.unauthenticated, 403: E.forbiddenRole, 404: "Activity not found.", 500: E.server },
    frontend: { pages: [PAGES.adminContent], when: "After the user confirms deletion.", ...ADMIN_CONTENT },
    client: { module: "activities", fn: "deleteActivity" },
    example: { params: { id: "act_demo_10" } },
  }),
} as const;
