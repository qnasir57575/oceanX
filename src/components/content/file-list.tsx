/**
 * Downloadable files (`FileRef`). Downloads are plain links to
 * `file.downloadUrl` — never fetch()ed. The server enforces access:
 * REGISTERED needs a login, RESTRICTED needs owner/staff access.
 * Note: GET /files/{id}/download is PLANNED; in mock mode links return 404.
 */
import type { AccessLevel, FileRef } from "@/types/api";
import { AccessBadge } from "@/components/content/badges";
import { AccessLoginHint } from "@/components/content/access-login-hint";
import { Icon } from "@/components/icons";
import { formatBytes } from "@/lib/format/number";
import { ACCESS_LEVEL_DESCRIPTIONS, label } from "@/lib/format/labels";

function fileKind(contentType: string, fileName: string): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toUpperCase() : "";
  if (ext) return ext;
  return contentType.split("/").pop()?.toUpperCase() ?? "File";
}

export function FileList({ files, accessLevel, className }: { files: FileRef[]; accessLevel?: AccessLevel; className?: string }) {
  if (files.length === 0) return <p className="text-ink-muted">No files are attached to this record.</p>;
  const levels = [...new Set(files.map((f) => f.accessLevel))];
  const shared = accessLevel ?? (levels.length === 1 ? levels[0] : undefined);
  return (
    <div className={className}>
      {shared ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
          <AccessBadge level={shared} />
          <span>{label(ACCESS_LEVEL_DESCRIPTIONS, shared)}</span>
          {shared === "REGISTERED" ? <AccessLoginHint /> : null}
        </div>
      ) : null}
      <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {files.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
            <Icon name="file" size={22} className="shrink-0 text-polar-800" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm break-all text-ink">{f.fileName}</p>
              <p className="text-xs text-ink-muted">
                {fileKind(f.contentType, f.fileName)} · {formatBytes(f.sizeBytes)}
                {!shared ? <> · {label(ACCESS_LEVEL_DESCRIPTIONS, f.accessLevel)}</> : null}
              </p>
            </div>
            {f.accessLevel === "RESTRICTED" ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <Icon name="lock" size={16} />
                Restricted
              </span>
            ) : (
              <a
                href={f.downloadUrl}
                download
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-glacier-700 px-3 text-sm font-medium text-white hover:bg-glacier-800"
              >
                <Icon name="download" size={16} />
                Download
                <span className="sr-only">
                  {" "}
                  {f.fileName} ({formatBytes(f.sizeBytes)})
                </span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Single prominent download button (e.g. a publication PDF). */
export function DownloadButton({ file, label: text = "Download PDF" }: { file: FileRef; label?: string }) {
  if (file.accessLevel === "RESTRICTED") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
        <Icon name="lock" size={16} />
        Full text is restricted
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <a
        href={file.downloadUrl}
        download
        className="inline-flex h-11 items-center gap-2 rounded-md bg-glacier-700 px-4 text-[0.9375rem] font-medium text-white hover:bg-glacier-800"
      >
        <Icon name="download" size={18} />
        {text}
        <span className="text-sm font-normal text-glacier-100">({formatBytes(file.sizeBytes)})</span>
      </a>
      {file.accessLevel === "REGISTERED" ? <AccessLoginHint /> : null}
    </span>
  );
}
