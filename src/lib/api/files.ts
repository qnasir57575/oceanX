import {
  ApiRequestError,
  MOCK_API_ENABLED,
  apiRequest,
  apiUrl,
  fetchWithTimeout,
  toApiRequestError,
  type RequestOptions,
} from "@/lib/api-client";
import type {
  ApiResponse,
  CreateUploadRequest,
  Deleted,
  FileAsset,
  UploadContentResult,
  UploadPurpose,
  UploadTicket,
  AccessLevel,
} from "@/types/api";

/**
 * File uploads use a 3-step signed-URL flow (NOT multipart/form-data):
 *   1. createUpload()       → ticket { fileId, uploadUrl, method: "PUT", headers }
 *   2. uploadFileContent()  → PUT raw bytes to ticket.uploadUrl
 *   3. completeUpload()     → FileAsset (status READY) to attach to content
 * `uploadFile()` does all three.
 */

/** POST /uploads — step 1. */
export function createUpload(body: CreateUploadRequest, options?: RequestOptions): Promise<ApiResponse<UploadTicket>> {
  return apiRequest("createUpload", { body }, options);
}

/** Step 2 — PUT the bytes to the ticket's uploadUrl (signed object-storage URL or the local-driver endpoint). */
export async function uploadFileContent(
  ticket: UploadTicket,
  file: Blob,
  options: RequestOptions & { onProgress?: (fraction: number) => void } = {},
): Promise<UploadContentResult> {
  if (MOCK_API_ENABLED) {
    const res = await apiRequest("putUploadContent", { params: { id: ticket.fileId } }, options);
    options.onProgress?.(1);
    return res.data;
  }
  const url = ticket.uploadUrl.startsWith("/") && typeof window === "undefined" ? apiUrl("putUploadContent", { id: ticket.fileId }) : ticket.uploadUrl;

  if (options.onProgress && typeof XMLHttpRequest !== "undefined") {
    return putWithProgress(url, ticket, file, options.onProgress, options.signal);
  }
  const response = await fetchWithTimeout("putUploadContent", url, {
    method: "PUT",
    headers: ticket.headers,
    body: file,
    credentials: "include",
    signal: options.signal,
    timeoutMs: options.timeoutMs ?? 10 * 60_000,
  });
  if (!response.ok) throw toApiRequestError("putUploadContent", response, await response.json().catch(() => null));
  // Object stores return an empty body; the local driver returns the envelope.
  const json = (await response.json().catch(() => null)) as ApiResponse<UploadContentResult> | null;
  return json?.data ?? { fileId: ticket.fileId, receivedBytes: file.size };
}

function putWithProgress(
  url: string,
  ticket: UploadTicket,
  file: Blob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<UploadContentResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.withCredentials = true;
    for (const [k, v] of Object.entries(ticket.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve({ fileId: ticket.fileId, receivedBytes: file.size });
      } else {
        let body: unknown = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {}
        reject(toApiRequestError("putUploadContent", new Response(null, { status: xhr.status }), body));
      }
    };
    xhr.onerror = () =>
      reject(new ApiRequestError({ status: 0, code: "NETWORK_ERROR", message: "Upload failed.", operationId: "putUploadContent" }));
    signal?.addEventListener("abort", () => {
      xhr.abort();
      reject(new ApiRequestError({ status: 0, code: "ABORTED", message: "Upload cancelled.", operationId: "putUploadContent" }));
    });
    xhr.send(file);
  });
}

/** POST /uploads/{id}/complete — step 3. */
export function completeUpload(fileId: string, options?: RequestOptions): Promise<ApiResponse<FileAsset>> {
  return apiRequest("completeUpload", { params: { id: fileId } }, options);
}

/** All three steps. Returns the READY file record. */
export async function uploadFile(
  file: File,
  opts: { purpose: UploadPurpose; accessLevel?: AccessLevel; onProgress?: (fraction: number) => void; signal?: AbortSignal },
): Promise<FileAsset> {
  const { data: ticket } = await createUpload(
    {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      purpose: opts.purpose,
      accessLevel: opts.accessLevel,
    },
    { signal: opts.signal },
  );
  await uploadFileContent(ticket, file, { onProgress: opts.onProgress, signal: opts.signal });
  const { data } = await completeUpload(ticket.fileId, { signal: opts.signal });
  return data;
}

/** GET /files/{id} — metadata. */
export function getFile(id: string, options?: RequestOptions): Promise<ApiResponse<FileAsset>> {
  return apiRequest("getFile", { params: { id } }, options);
}

/**
 * URL for GET /files/{id}/download. Use it as a link: `<a href={getFileDownloadUrl(id)} download>`.
 * Do not fetch() it — it redirects to a signed URL. (FileRef.downloadUrl already contains this.)
 */
export function getFileDownloadUrl(id: string): string {
  return apiUrl("downloadFile", { id });
}

/** DELETE /files/{id} */
export function deleteFile(id: string, options?: RequestOptions): Promise<ApiResponse<Deleted>> {
  return apiRequest("deleteFile", { params: { id } }, options);
}
