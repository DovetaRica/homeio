# NAS desktop integration — 2026-10-01

The desktop keeps Infrastructure and reads the same official TrueNAS API as the
main panel. Network includes interfaces/bonding and gateway/DNS. Storage includes
pools, datasets, disks, snapshots, SMB and scrub schedules. The old Docker section
now shows TrueNAS-managed apps. Independent services remain desktop bookmarks;
their containers are not incorrectly presented as TrueNAS-managed apps.

Infrastructure shares the existing resource views, typed forms, administrator
authorization, password confirmation, one-use preview and audit trail. It does
not re-enable Homeio host management routes or add a Docker socket.

NAS desktop mode removes weather, Wi-Fi/battery status and container-only status
widgets. Its sidebar shows real NAS pools/apps/alerts. Settings removes Homeio
updates, backup/restore, power and the duplicate host task scheduler. Settings
search also filters these sections. The general section shows TrueNAS information
and browser language instead of editable container hostname/timezone fields.
Google Drive is disabled with the existing feature flag, including settings,
file-manager menu and connection polling. Existing files, saved configuration and
deployment backups are not deleted. Unsupported host network, Docker, USB, backup,
power and update queries are disabled in NAS desktop mode.

Desktop monitoring/disk windows reuse NAS overview/storage resources. NAS reboot
and shutdown are removed from both the visible operation catalog and its API
allowlist, leaving 84 curated operations. Native TrueNAS remains available.

Runtime mode is provided by the server-rendered desktop route through a context;
standard upstream desktop behavior is preserved outside NAS mode (apart from the
fork's explicitly disabled Google Drive feature).

Validation: 22 focused integration/security/i18n tests, TypeScript and ESLint,
Linux production build and isolated smoke test passed. Acceptance uses read-only
production resources and previews, never storage/network mutations.

Image: homeio-local:1.9.6-truenas.4
sha256:baecf55a139d2596bc89e0af2998ac622ab50e1b178d4762a8ad7e771d5da886
Backup: /mnt/maindata/apps/homeio/backups/pre-desktop-20261001
Restore that backup's compose.yaml via the native Custom App editor to revert
this desktop change. No database restore is needed for this UI rollback.

Embedded settings views use compact headings and toolbars. Notification and date
calendar controls remain on the desktop top bar. The final layout-only build
also has a backup at /mnt/maindata/apps/homeio/backups/pre-desktop-20261001-2.
