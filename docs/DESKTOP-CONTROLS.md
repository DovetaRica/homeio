# Desktop controls — 2026-10-01

TrueNAS navigation uses text without decorative icons, including the NAS group in Settings. Existing VM navigation is retained.

Desktop windows resize from all four edges and corners, with a visible bottom-right handle. The handle also supports arrow keys (10px; Shift 50px). Minimum size remains 500 × 350. NAS Settings content fills the available width and height; genuine overflow still scrolls.

External service shortcuts have an unknown runtime status because Homeio cannot inspect their Docker/Compose runtime. Unknown now keeps the original icon and uses a neutral indicator without an alert badge or pulse. Known stopped status retains its error presentation. This change does not introduce health checks for external services.

Validation: 28 relevant NAS/i18n/presenter/window tests passed across focused runs; changed-file lint, type check and Linux production build passed. Actual browser dragging increased the Settings window from 860 × 620 to 1210 × 790, with live storage data displayed. All 23 NAS resources, 20 parallel reads, preview and origin protections passed. Existing session, 11 launchers and files were retained; all three containers are healthy, and SMB and movie/downloads ACLs are unchanged.

Deployed image: homeio-local:1.9.6-truenas.8
Immutable ID: sha256:064e80630ba8e73b5680437498d587f2b9d36c61b4172d6693fc7427f3f4a9fb
Backup: /mnt/maindata/apps/homeio/backups/pre-controls-20261001
Rollback: restore that backup's compose.yaml through the existing TrueNAS custom app. UI rollback does not require restoring the database.
