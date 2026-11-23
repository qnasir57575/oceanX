import type { Metadata } from "next";
import { Suspense, cache } from "react";
import { getMediaAsset } from "@/lib/api/media";
import type { MediaAsset } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { DetailLayout, DetailPageSkeleton } from "@/components/layout/detail";
import { Markdown } from "@/components/ui/markdown";
import { FactsCard, MetaList } from "@/components/ui/meta-list";
import { DateTime } from "@/components/ui/date-time";
import { ApiImage, ApiImageCover } from "@/components/ui/api-image";
import { MediaTypeBadge, RegionBadge } from "@/components/content/badges";
import { CategoryLinks, KeywordLinks } from "@/components/content/taxonomy-links";
import { ExpeditionLink, ExternalLink } from "@/components/content/record-links";
import { Icon } from "@/components/icons";
import { orNotFound, recordMetadata } from "@/lib/ui/load";
import { formatCoordinates, formatDurationLong } from "@/lib/format/number";
import { label, MEDIA_TYPE_LABELS, REGION_LABELS } from "@/lib/format/labels";

const loadMedia = cache((slug: string) => getMediaAsset(slug));

export async function generateMetadata({ params }: PageProps<"/gallery/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return recordMetadata(
    loadMedia(slug),
    ({ data }) => ({
      title: data.title,
      description: data.altText,
      openGraph: { images: [{ url: data.thumbnailUrl, alt: data.altText }] },
    }),
    "Media",
  );
}

export default function MediaPage({ params }: PageProps<"/gallery/[slug]">) {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <MediaDetail params={params} />
    </Suspense>
  );
}

const isFile = (url: string, exts: string[]) => new RegExp(`\\.(${exts.join("|")})(\\?.*)?$`, "i").test(url);
const isExternal = (url: string) => /^https?:\/\//.test(url);

/** Viewer for each media type. Unknown/external URLs fall back to a poster + link. */
function MediaViewer({ m }: { m: MediaAsset }) {
  const poster = { url: m.thumbnailUrl, alt: m.altText, width: m.width, height: m.height };

  if (m.type === "IMAGE") {
    return <ApiImage image={{ url: m.url, alt: m.altText, width: m.width, height: m.height }} priority className="rounded-lg" />;
  }
  if (m.type === "VIDEO" && m.embedUrl) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg bg-polar-950">
        <iframe
          src={m.embedUrl}
          title={`Video: ${m.title}`}
          className="absolute inset-0 size-full"
          allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  if (m.type === "VIDEO" && isFile(m.url, ["mp4", "webm", "ogv", "mov"])) {
    return (
      // Captions are not provided by the API; altText/description describe the content.
      <video controls preload="metadata" poster={m.thumbnailUrl} className="w-full rounded-lg bg-polar-950" aria-label={m.altText}>
        <source src={m.url} />
        <a href={m.url}>Download the video</a>
      </video>
    );
  }
  if (m.type === "AUDIO" && isFile(m.url, ["mp3", "ogg", "oga", "wav", "m4a", "aac", "webm"])) {
    return (
      <div className="space-y-4">
        <ApiImageCover image={poster} className="rounded-lg" priority />
        <audio controls preload="metadata" className="w-full" aria-label={`Audio: ${m.title}`}>
          <source src={m.url} />
          <a href={m.url}>Download the audio</a>
        </audio>
      </div>
    );
  }
  const action = m.type === "VIDEO" ? "Watch the video" : m.type === "AUDIO" ? "Listen to the recording" : "Open the document";
  return (
    <div className="space-y-4">
      <ApiImageCover image={poster} className="rounded-lg" priority />
      {isExternal(m.url) ? (
        <ExternalLink href={m.url} className="inline-flex h-11 items-center gap-2 rounded-md bg-glacier-700 px-4 font-medium text-white hover:bg-glacier-800">
          {action}
        </ExternalLink>
      ) : (
        <a href={m.url} className="inline-flex h-11 items-center gap-2 rounded-md bg-glacier-700 px-4 font-medium text-white hover:bg-glacier-800">
          <Icon name={m.type === "DOCUMENT" ? "file" : "arrow-right"} size={18} />
          {action}
        </a>
      )}
    </div>
  );
}

async function MediaDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: m } = await orNotFound(loadMedia(slug));

  return (
    <>
      <PageHeader
        title={m.title}
        breadcrumbs={[{ href: "/", label: "Home" }, { href: "/gallery", label: "Media gallery" }, { label: m.title }]}
        eyebrow={
          <span className="flex flex-wrap gap-2 normal-case">
            <MediaTypeBadge type={m.type} />
            <RegionBadge region={m.region} />
          </span>
        }
      />
      <DetailLayout
        main={
          <>
            <figure>
              <MediaViewer m={m} />
              <figcaption className="mt-3 text-sm text-ink-muted">
                {m.altText}
                {m.credit ? <span className="block">Credit: {m.credit}</span> : null}
              </figcaption>
            </figure>
            {m.description ? (
              <section aria-label="Caption">
                <Markdown>{m.description}</Markdown>
              </section>
            ) : null}
          </>
        }
        aside={
          <>
            <FactsCard title="About this item">
              <MetaList
                items={[
                  { label: "Type", value: label(MEDIA_TYPE_LABELS, m.type) },
                  { label: "Captured", value: m.capturedAt ? <DateTime value={m.capturedAt} style="long" /> : null },
                  { label: "Duration", value: m.durationSeconds ? formatDurationLong(m.durationSeconds) : null },
                  { label: "Dimensions", value: m.width && m.height ? `${m.width} × ${m.height} px` : null },
                  { label: "Region", value: m.region ? label(REGION_LABELS, m.region) : null },
                  {
                    label: "Location",
                    value: m.location ? (
                      <>
                        {m.location.label ? <span className="block">{m.location.label}</span> : null}
                        <span className="font-mono text-sm">{formatCoordinates(m.location.latitude, m.location.longitude)}</span>
                      </>
                    ) : null,
                  },
                  { label: "Credit", value: m.credit },
                  { label: "Licence", value: m.license },
                  { label: "Expedition", value: m.expedition ? <ExpeditionLink expedition={m.expedition} /> : null },
                ]}
              />
            </FactsCard>
            {m.categories.length > 0 ? (
              <FactsCard title="Research topics">
                <CategoryLinks categories={m.categories} />
              </FactsCard>
            ) : null}
            {m.keywords.length > 0 ? (
              <FactsCard title="Keywords">
                <KeywordLinks keywords={m.keywords} />
              </FactsCard>
            ) : null}
          </>
        }
      />
    </>
  );
}
