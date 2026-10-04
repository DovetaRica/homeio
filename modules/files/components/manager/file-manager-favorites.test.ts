import { describe, expect, it } from "vitest";
import type { FileListEntry } from "@/lib/shared/contracts/files";
import {
  getSidebarSections,
  sidebarSections,
  STARRED_VIRTUAL_PATH,
} from "./file-manager-derived";

function folder(name: string, path = name): FileListEntry {
  return {
    name,
    path,
    type: "folder",
    ext: null,
    sizeBytes: null,
    modifiedAt: "2026-01-01T00:00:00.000Z",
    mtimeMs: 0,
  };
}

function file(name: string, path = name): FileListEntry {
  return { ...folder(name, path), type: "file", ext: "txt", sizeBytes: 3 };
}

function favorites(rootEntries: FileListEntry[] | undefined) {
  return getSidebarSections(true, rootEntries).find(
    (section) => section.title === "Favorites",
  );
}

describe("getSidebarSections", () => {
  it("returns the untouched static sections when not in NAS mode", () => {
    expect(getSidebarSections(false, undefined)).toBe(sidebarSections);
    expect(getSidebarSections(false, [folder("movies")])).toBe(sidebarSections);
    expect(
      sidebarSections
        .find((section) => section.title === "Favorites")
        ?.items.map((item) => item.name),
    ).toEqual(["Home", "Starred", "Documents", "Downloads", "Media", "Apps"]);
  });

  it("shows only the virtual Home and Starred entries while loading or after a failure", () => {
    for (const entries of [undefined, []]) {
      const section = favorites(entries);
      expect(section?.items.map((item) => item.name)).toEqual(["Home", "Starred"]);
      expect(section?.items.map((item) => item.path)).toEqual([
        [],
        [...STARRED_VIRTUAL_PATH],
      ]);
    }
  });

  it("uses the real root folders with exact lowercase names and backend path segments", () => {
    const section = favorites([folder("movies"), folder("downloads")]);

    expect(section?.items.map((item) => item.name)).toEqual([
      "Home",
      "Starred",
      "movies",
      "downloads",
    ]);
    expect(section?.items.map((item) => item.path)).toEqual([
      [],
      [...STARRED_VIRTUAL_PATH],
      ["movies"],
      ["downloads"],
    ]);
    expect(section?.items.map((item) => item.name)).not.toContain("Downloads");
    expect(section?.items.map((item) => item.name)).not.toContain("Media");
  });

  it("ignores files, hidden folders, Trash and duplicates", () => {
    const section = favorites([
      file("notes.txt"),
      folder(".config"),
      folder("visible", ".hidden/visible"),
      folder("Trash"),
      folder("movies"),
      folder("movies"),
      folder("Other"),
    ]);

    expect(section?.items.map((item) => item.name)).toEqual([
      "Home",
      "Starred",
      "movies",
      "Other",
    ]);
  });

  it("keeps the fixed Locations and Cloud sections in NAS mode", () => {
    expect(getSidebarSections(true, undefined).map((section) => section.title)).toEqual([
      "Favorites",
      "Locations",
      "Cloud",
    ]);
  });
});
