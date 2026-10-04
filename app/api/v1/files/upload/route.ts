import "server-only";

import type { ReadableStream as WebReadableStream } from "stream/web";
import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import busboy from "busboy";
import { requireApiSession } from "@/lib/server/modules/auth/api";
import {
  createRequestId,
  logServerAction,
  withServerTiming,
} from "@/lib/server/logging/logger";
import {
  FileServiceError,
  uploadFiles,
} from "@/lib/server/modules/files/service";
import type { FileUploadResponse } from "@/lib/shared/contracts/files";

export const runtime = "nodejs";

export const maxDuration = 300;

/**
 * Stream-parse a multipart upload and pipe each file directly to disk via
 * uploadFiles, so the full file body is never held in memory at once.
 *
 * Fields (path, includeHidden) MUST appear before file parts in the
 * multipart body — this is the convention and what the client sends.
 */
function streamingUpload(req: NextRequest): Promise<FileUploadResponse> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers.get("content-type") ?? "";

    let bb: ReturnType<typeof busboy>;
    try {
      bb = busboy({
        headers: { "content-type": contentType },
        // Browser multipart filenames are UTF-8 in the raw header bytes;
        // busboy defaults to latin1 for non-RFC 5987 parameters.
        defParamCharset: "utf8",
      });
    } catch (err) {
      reject(new Error(`Invalid multipart request: ${String(err)}`));
      return;
    }

    let settled = false;
    let source: Readable | null = null;
    let destinationPath = "";
    let includeHidden = false;
    const fileStreams = new Set<Readable>();
    const filePromises: Promise<FileUploadResponse>[] = [];

    function cleanup() {
      req.signal?.removeEventListener("abort", onAbort);
    }

    function teardown(reason: Error) {
      // Destroy the inbound source and every in-flight file stream so active
      // pipelines reject (rather than closing cleanly as a complete upload) and
      // uploadFiles removes any partial files it owns. The 'error' listeners
      // attached below keep these destructions from becoming unhandled events.
      for (const stream of fileStreams) {
        stream.destroy(reason);
      }
      fileStreams.clear();
      source?.destroy();
      // Pass the reason so busboy does not synthesize its own "end of form"
      // error during destroy.
      bb.destroy(reason);
    }

    function fail(error: unknown) {
      if (settled) return;
      settled = true;
      cleanup();
      teardown(error instanceof Error ? error : new Error(String(error)));
      reject(error);
    }

    function succeed(value: FileUploadResponse) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }

    function onAbort() {
      fail(new Error("Request aborted"));
    }

    // Registered before any fail() path (including the pre-aborted signal
    // below) so busboy's own teardown errors are never unhandled.
    bb.on("error", fail);

    // The signal may already be aborted before we can subscribe; fail closed
    // instead of waiting for an event that will never fire.
    if (req.signal?.aborted) {
      fail(new Error("Request aborted"));
      return;
    }
    req.signal?.addEventListener("abort", onAbort, { once: true });

    bb.on("field", (name, value) => {
      if (name === "path") destinationPath = value;
      if (name === "includeHidden") includeHidden = value === "true";
    });

    bb.on("file", (_field, fileStream, info) => {
      // Capture field values at the moment the file part begins.
      // The client sends fields first so these are already populated.
      const dest = destinationPath;
      const hidden = includeHidden;

      fileStreams.add(fileStream);
      fileStream.once("close", () => {
        fileStreams.delete(fileStream);
      });
      // A skipped part has no pipeline attached; surface errors here so they
      // never become unhandled 'error' events.
      fileStream.on("error", (error) => {
        fail(error);
      });

      // If uploadFiles skips this part (duplicate name, invalid name) it never
      // reads the stream, which would leave busboy paused and the request
      // hanging. Resume the unread stream once the file promise settles.
      const drain = () => {
        if (!fileStream.readableEnded && !fileStream.destroyed) {
          fileStream.resume();
        }
      };

      // Wrap the live busboy Node.js Readable as a web ReadableStream so it
      // matches the uploadFiles interface. The conversion pauses the source
      // stream, so it is done lazily: uploadFiles only calls stream() when it
      // actually pipes the part to disk. On the skip path nothing reads it and
      // drain() below can resume the untouched busboy stream. Data flows
      // directly to disk without any intermediate in-memory buffer, and the
      // real size is read from disk after the pipeline completes.
      const filePromise = uploadFiles({
        destinationPath: dest,
        includeHidden: hidden,
        files: [
          {
            name: info.filename,
            size: 0,
            stream: () => Readable.toWeb(fileStream) as ReadableStream,
          },
        ],
      }).finally(drain);

      // Attach settlement handlers immediately so a rejected promise surfaces
      // without waiting for 'finish' (which may never arrive on a broken
      // upload) and never becomes an unhandled rejection.
      filePromises.push(
        filePromise.then(
          (result) => result,
          (error) => {
            fail(error);
            return { uploaded: [], skipped: [] };
          },
        ),
      );
    });

    bb.on("finish", () => {
      Promise.all(filePromises)
        .then((results) => {
          const merged: FileUploadResponse = { uploaded: [], skipped: [] };
          for (const r of results) {
            merged.uploaded.push(...r.uploaded);
            merged.skipped.push(...r.skipped);
          }
          succeed(merged);
        })
        .catch(fail);
    });

    if (!req.body) {
      fail(new Error("No request body"));
      return;
    }

    source = Readable.fromWeb(req.body as WebReadableStream);
    source.on("error", (error) => {
      fail(error);
    });
    source.pipe(bb);
  });
}

export async function POST(request: NextRequest) {
  const apiSession = await requireApiSession(request);
  if (apiSession.response) return apiSession.response;
  const requestId = createRequestId();

  try {
    return await withServerTiming(
      {
        layer: "api",
        action: "files.upload.post",
        requestId,
      },
      async () => {
        const data = await streamingUpload(request);

        if (data.uploaded.length === 0 && data.skipped.length === 0) {
          return NextResponse.json(
            { error: "No files provided" },
            { status: 400 },
          );
        }

        return NextResponse.json({ data });
      },
    );
  } catch (error) {
    if (error instanceof FileServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    logServerAction({
      layer: "api",
      action: "files.upload.post",
      requestId,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 },
    );
  }
}
