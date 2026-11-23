/**
 * Image from the API (`ImageRef` or media fields). Uses next/image with
 * `unoptimized` because API URLs may be external hosts or SVGs, and the
 * shared next.config.ts has no remotePatterns. Alt text always comes from
 * the API.
 */
import Image from "next/image";
import { cn } from "@/lib/ui/cn";

export interface ApiImageSource {
  url: string;
  alt: string;
  width?: number | null;
  height?: number | null;
}

/** Fills a fixed-aspect box (cards, tiles). */
export function ApiImageCover({
  image,
  aspect = "aspect-[16/9]",
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
  className,
}: {
  image: ApiImageSource;
  aspect?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-polar-100", aspect, className)}>
      <Image src={image.url} alt={image.alt} fill sizes={sizes} priority={priority} unoptimized className="object-cover" />
    </div>
  );
}

/** Intrinsic-size image (detail pages). Falls back to a 16:9 cover box without dimensions. */
export function ApiImage({
  image,
  priority = false,
  className,
}: {
  image: ApiImageSource;
  priority?: boolean;
  className?: string;
}) {
  if (!image.width || !image.height) {
    return <ApiImageCover image={image} priority={priority} className={className} sizes="(min-width: 1024px) 66vw, 100vw" />;
  }
  return (
    <Image
      src={image.url}
      alt={image.alt}
      width={image.width}
      height={image.height}
      priority={priority}
      unoptimized
      className={cn("h-auto w-full bg-polar-100", className)}
    />
  );
}

/** Credit line under an image, e.g. "Photo: …". */
export function ImageCredit({ credit, className }: { credit?: string | null; className?: string }) {
  if (!credit) return null;
  return <p className={cn("mt-2 text-xs text-ink-muted", className)}>Credit: {credit}</p>;
}
