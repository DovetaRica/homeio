import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/modules/files/service", () => ({
  FileServiceError: class FileServiceError extends Error {
    code: string;
    statusCode: number;

    constructor(
      message: string,
      options?: { code?: string; statusCode?: number },
    ) {
      super(message);
      this.code = options?.code ?? "internal_error";
      this.statusCode = options?.statusCode ?? 500;
    }
  },
  uploadFiles: vi.fn(),
}));

import { POST } from "@/app/api/v1/files/upload/route";
import {
  FileServiceError,
  uploadFiles,
} from "@/lib/server/modules/files/service";

type FieldPart = { name: string; value: string };
type FilePart = { name: string; filename: string; content: string };

function multipartBody(
  parts: Array<FieldPart | FilePart>,
  boundary: string,
  chunkSize?: number,
) {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    if ("value" in part) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`,
          "utf8",
        ),
      );
    } else {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"; filename="${part.filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
          "utf8",
        ),
      );
      chunks.push(Buffer.from(part.content, "utf8"));
      chunks.push(Buffer.from("\r\n", "utf8"));
    }
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));

  const combined = Buffer.concat(chunks);
  const size = chunkSize ?? combined.length;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < combined.length; offset += size) {
        controller.enqueue(
          new Uint8Array(combined.subarray(offset, offset + size)),
        );
      }
      controller.close();
    },
  });

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function uploadRequest(
  body: ReadableStream<Uint8Array>,
  contentType: string,
  signal?: AbortSignal,
) {
  return new NextRequest("http://localhost/api/v1/files/upload", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
    duplex: "half",
    signal,
  });
}

describe("POST /api/v1/files/upload", () => {
  beforeEach(() => {
    // mockReset clears any unconsumed mockImplementationOnce queue left by a
    // prior test (restoreMocks does not clear module-mock once queues).
    vi.mocked(uploadFiles).mockReset();
    vi.mocked(uploadFiles).mockResolvedValue({ uploaded: [], skipped: [] });
  });

  it("decodes UTF-8 filenames with Chinese characters, spaces, and emoji", async () => {
    const filename = "报告 📄.txt";
    vi.mocked(uploadFiles).mockResolvedValueOnce({
      uploaded: [{ name: filename, path: filename, sizeBytes: 4 }],
      skipped: [],
    });

    const { body, contentType } = multipartBody(
      [
        { name: "path", value: "Documents" },
        { name: "includeHidden", value: "false" },
        { name: "file", filename, content: "data" },
      ],
      "----utf8-boundary",
    );

    const response = await POST(uploadRequest(body, contentType));
    const json = (await response.json()) as {
      data: { uploaded: { name: string }[] };
    };

    expect(response.status).toBe(200);
    expect(json.data.uploaded[0]?.name).toBe(filename);
    expect(uploadFiles).toHaveBeenCalledTimes(1);
    expect(vi.mocked(uploadFiles).mock.calls[0]?.[0].files[0]?.name).toBe(
      filename,
    );
    expect(vi.mocked(uploadFiles).mock.calls[0]?.[0].destinationPath).toBe(
      "Documents",
    );
  });

  it("drains a skipped file stream so the request terminates", async () => {
    vi.mocked(uploadFiles).mockResolvedValueOnce({
      uploaded: [],
      skipped: ["notes.txt"],
    });

    // 512 KiB delivered in 4 KiB chunks: without draining the unread part,
    // busboy backpressure would stall before 'finish' and the request hangs.
    const { body, contentType } = multipartBody(
      [
        { name: "path", value: "" },
        { name: "file", filename: "notes.txt", content: "x".repeat(512 * 1024) },
      ],
      "----skip-boundary",
      4096,
    );

    const response = await POST(uploadRequest(body, contentType));
    const json = (await response.json()) as { data: { skipped: string[] } };

    expect(response.status).toBe(200);
    expect(json.data.skipped).toEqual(["notes.txt"]);
  }, 15000);

  it("surfaces a rejected file promise without hanging", async () => {
    vi.mocked(uploadFiles).mockRejectedValueOnce(
      new FileServiceError("disk full", {
        code: "internal_error",
        statusCode: 500,
      }),
    );

    const { body, contentType } = multipartBody(
      [
        { name: "path", value: "" },
        { name: "file", filename: "notes.txt", content: "data" },
      ],
      "----reject-boundary",
    );

    const response = await POST(uploadRequest(body, contentType));
    const json = (await response.json()) as { code: string };

    expect(response.status).toBe(500);
    expect(json.code).toBe("internal_error");
  }, 15000);

  it("returns 500 for a multipart parser error", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/v1/files/upload", {
        method: "POST",
        headers: { "content-type": "multipart/form-data" },
        body: "not multipart",
      }),
    );

    expect(response.status).toBe(500);
  });

  it("fails fast when the request body stream errors mid-upload", async () => {
    const boundary = "----error-boundary";
    const prefix = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="path"\r\n\r\n\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      "utf8",
    );
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(prefix));
        controller.enqueue(new Uint8Array(Buffer.alloc(64 * 1024, 1)));
        controller.error(new Error("connection reset"));
      },
    });
    // Keep the file promise pending so the body error is the failure source.
    vi.mocked(uploadFiles).mockReturnValueOnce(new Promise(() => {}));

    const response = await POST(
      uploadRequest(body, `multipart/form-data; boundary=${boundary}`),
    );

    expect(response.status).toBe(500);
  }, 15000);

  it("fails immediately when the request signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { body, contentType } = multipartBody(
      [
        { name: "path", value: "" },
        { name: "file", filename: "notes.txt", content: "data" },
      ],
      "----pre-aborted-boundary",
    );

    const response = await POST(
      uploadRequest(body, contentType, controller.signal),
    );

    expect(response.status).toBe(500);
  }, 15000);

  it("tears down in-flight streams when the request is aborted", async () => {
    const controller = new AbortController();
    let webStream: ReadableStream<Uint8Array> | undefined;
    let markStarted: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });

    vi.mocked(uploadFiles).mockImplementationOnce((params) => {
      webStream = params.files[0]?.stream() as ReadableStream<Uint8Array>;
      markStarted();
      // Pending forever: the abort must be what terminates the request.
      return new Promise(() => {});
    });

    const boundary = "----abort-mid-boundary";
    const prefix = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="path"\r\n\r\n\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      "utf8",
    );
    const body = new ReadableStream<Uint8Array>({
      start(streamController) {
        streamController.enqueue(new Uint8Array(prefix));
        streamController.enqueue(new Uint8Array(Buffer.alloc(64 * 1024, 1)));
        // Deliberately never closes: the abort is the terminating condition.
      },
    });

    const responsePromise = POST(
      uploadRequest(
        body,
        `multipart/form-data; boundary=${boundary}`,
        controller.signal,
      ),
    );

    await started;
    controller.abort();
    const response = await responsePromise;

    expect(response.status).toBe(500);
    // The teardown destroyed the busboy file stream with the failure reason.
    // Buffered bytes may still be readable first, but the stream must then
    // error rather than end cleanly as a complete upload.
    const reader = webStream!.getReader();
    let rejected = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const readResult = await reader.read();
        if (readResult.done) break;
      } catch {
        rejected = true;
        break;
      }
    }
    expect(rejected).toBe(true);
  }, 15000);
});
