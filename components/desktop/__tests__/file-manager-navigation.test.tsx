/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {DesktopModeProvider} from '@/lib/ui/desktop-mode';
import { beforeEach, describe, expect, it } from "vitest";
import {
  mockDirectory,
  mockUseFilesDirectory,
  mockUseCurrentUser,
  mockUseNetworkShares,
  renderFileManager,
  resetFileManagerMocks,
} from "./file-manager-test-utils";

describe("FileManager navigation", () => {
  beforeEach(resetFileManagerMocks);
  it('uses actual NAS mounts as stable shortcuts while browsing inside a directory', async () => {
    const {FileManager}=await import('@/modules/files/components/file-manager');
    mockUseFilesDirectory.mockImplementation((path: string[]) => mockDirectory(path.length ? [] : [{name:'movie',path:'movie',type:'folder'},{name:'downloads',path:'downloads',type:'folder'}]));
    render(<DesktopModeProvider nasMode><FileManager/></DesktopModeProvider>);
    const shortcuts=within(screen.getByRole('complementary'));
    expect(screen.queryByRole('button', {name:'Documents',exact:true})).toBeNull();
    expect(screen.queryByRole('button', {name:'Apps',exact:true})).toBeNull();
    fireEvent.click(shortcuts.getByRole('button', {name:'movie',exact:true}));
    await waitFor(() => expect(mockUseFilesDirectory.mock.calls.at(-1)?.[0]).toEqual(['movie']));
    expect(screen.getByRole('button', {name:'downloads',exact:true})).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name:'downloads',exact:true}));
    await waitFor(() => expect(mockUseFilesDirectory.mock.calls.at(-1)?.[0]).toEqual(['downloads']));
    expect(screen.getByRole('button', {name:'Starred',exact:true})).toBeTruthy();
  });

  it("navigates to /Shared from sidebar Shared button", async () => {
    await renderFileManager();
    fireEvent.click(screen.getByRole("button", { name: "Shared" }));

    await waitFor(() => {
      const calls = mockUseFilesDirectory.mock.calls;
      expect(calls[calls.length - 1]?.[0]).toEqual(["Shared"]);
    });
  });

  it("shows network hosts under Locations", () => {
    mockUseNetworkShares.mockReturnValue({
      data: [
        {
          id: "share-1",
          host: "nastabib.local",
          share: "Media",
          username: "user",
          mountPath: "Network/nastabib.local/Media",
          isMounted: true,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    return renderFileManager().then(() => {
      expect(screen.getByRole("button", { name: "nastabib.local" })).toBeTruthy();
    });
  });

  it("hides network storage in demo mode", () => {
    mockUseCurrentUser.mockReturnValue({
      data: {
        id: "demo-user",
        username: "homeio",
        isDemoMode: true,
      },
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseNetworkShares.mockReturnValue({
      data: [
        {
          id: "share-1",
          host: "nastabib.local",
          share: "Media",
          username: "user",
          mountPath: "Network/nastabib.local/Media",
          isMounted: true,
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    return renderFileManager().then(() => {
      expect(screen.queryByRole("button", { name: "nastabib.local" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Add location" })).toBeNull();
    });
  });

  it("navigates Apps favorite to /AppData", async () => {
    await renderFileManager();
    fireEvent.click(screen.getByRole("button", { name: "Apps" }));

    await waitFor(() => {
      const calls = mockUseFilesDirectory.mock.calls;
      expect(calls[calls.length - 1]?.[0]).toEqual(["AppData"]);
    });
  });

  it("renders real storage usage text in sidebar", () => {
    return renderFileManager().then(() => {
      expect(screen.getByText("1.8 TB / 4 TB")).toBeTruthy();
    });
  });

  it("shows Empty Trash in header and deletes all trash entries", async () => {
    mockUseFilesDirectory.mockImplementation((pathSegments: string[]) => {
      if (pathSegments[0] === "Trash") {
        return mockDirectory([
          { name: "a.txt", path: "Trash/a.txt", type: "file" },
          { name: "b.txt", path: "Trash/b.txt", type: "file" },
        ]);
      }
      return mockDirectory([]);
    });

    await renderFileManager();
    fireEvent.click(screen.getByRole("button", { name: "Trash" }));
    fireEvent.click(await screen.findByRole("button", { name: /empty trash/i }));
    fireEvent.click(
      await screen.findAllByRole("button", { name: /empty trash/i }).then((buttons) => buttons.at(-1)!),
    );

    await waitFor(() => {
      expect(screen.getByText(/trash emptied/i)).toBeTruthy();
    });
  });
});
