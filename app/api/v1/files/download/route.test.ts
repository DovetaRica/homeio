import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/modules/files/service", () => ({
  FileServiceError: class FileServiceError extends Error {
    code: string;
    statusCode: number;

    constructor(message: string, code = "internal_error", statusCode = 500) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
  getMimeTypeForExtension: vi.fn(),
  resolveReadableFileAbsolutePath: vi.fn(),
}));

import { GET } from "@/app/api/v1/files/download/route";
import {
  FileServiceError,
  getMimeTypeForExtension,
  resolveReadableFileAbsolutePath,
} from "@/lib/server/modules/files/service";

function encodeRfc5987(value: string) {
  return encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

describe("GET /api/v1/files/download", () => {
  let tempDir = "";
  let downloadFile = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "home-server-download-"));
    downloadFile = path.join(tempDir, "report.txt");
    await writeFile(downloadFile, "hello", "utf8");
    vi.mocked(getMimeTypeForExtension).mockReturnValue("text/plain; charset=utf-8");
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  function mockResolvedPath(relativePath: string) {
    vi.mocked(resolveReadableFileAbsolutePath).mockResolvedValueOnce({
      root: tempDir,
      path: relativePath,
      absolutePath: downloadFile,
    });
  }

  function request(pathValue: string) {
    return new NextRequest(
      `http://localhost/api/v1/files/download?path=${encodeURIComponent(pathValue)}`,
    );
  }

  it("requires a path query parameter", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/v1/files/download"),
    );
    const json = (await response.json()) as { code: string };

    expect(response.status).toBe(400);
    expect(json.code).toBe("invalid_path");
  });

  it("carries the Unicode basename in filename* with an ASCII fallback", async () => {
    mockResolvedPath("文档/报告 📄.txt");

    const response = await GET(request("文档/报告 📄.txt"));
    const header = response.headers.get("Content-Disposition") ?? "";

    expect(response.status).toBe(200);
    expect(header).toContain("attachment;");
    expect(header).toContain(`filename*=UTF-8''${encodeRfc5987("报告 📄.txt")}`);
    expect(header).toContain('filename="__ __.txt"');
    // The whole header must be a valid ByteString (ASCII printable).
    expect(/^[\x20-\x7e]*$/.test(header)).toBe(true);
    expect(await response.text()).toBe("hello");
  });

  it("strips CRLF and quotes from the fallback filename", async () => {
    mockResolvedPath('evil\r\nX-Injected: 1"quote.txt');

    const response = await GET(request("evil.txt"));
    const header = response.headers.get("Content-Disposition") ?? "";

    expect(response.status).toBe(200);
    expect(header).not.toContain("\r");
    expect(header).not.toContain("\n");
    expect(header).toContain('filename="evilX-Injected: 1quote.txt"');
    // Exactly the two quotes delimiting the fallback parameter.
    expect(header.split('"')).toHaveLength(3);
  });

  it.runIf(path.sep === "/")("strips backslashes from the fallback filename", async () => {
    mockResolvedPath('dir\\na"me.txt');

    const response = await GET(request("weird.txt"));
    const header = response.headers.get("Content-Disposition") ?? "";

    expect(response.status).toBe(200);
    expect(header).toContain('filename="dirname.txt"');
  });

  it("percent-encodes RFC 5987 non-attr characters", async () => {
    mockResolvedPath("weird'()*.txt");

    const response = await GET(request("weird.txt"));
    const header = response.headers.get("Content-Disposition") ?? "";

    expect(response.status).toBe(200);
    expect(header).toContain("filename*=UTF-8''weird%27%28%29%2A.txt");
  });

  it("maps service errors", async () => {
    vi.mocked(resolveReadableFileAbsolutePath).mockRejectedValueOnce(
      new FileServiceError("blocked", "symlink_blocked", 403),
    );

    const response = await GET(request("bad"));
    const json = (await response.json()) as { code: string };

    expect(response.status).toBe(403);
    expect(json.code).toBe("symlink_blocked");
  });
});
