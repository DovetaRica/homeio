# NAS launcher icons

Existing application icons are mirrored from the installed services' own favicon/apple-touch-icon resources (see public/app-icons/sources.json for origin and SHA-256). No external CDN is required by the desktop. Eight launchers use seven assets, with both Sonarr entries sharing the Sonarr icon. Home AI, CCTV and WebStream retain their existing custom presentation.

The installed-app repository now returns the existing database icon_url as logoUrl; previously this metadata was omitted from the desktop API. scripts/nas-launcher-icons.sql updates only the eight known launchers' icon metadata; it does not install or restart their services.

Production: homeio-local:1.9.6-truenas.9, sha256:0407d497eb62d3c5bdce9ffe078255d0616ad427b36f17a60b7b66f4e0dab3bb.
Backup: /mnt/maindata/apps/homeio/backups/pre-icons-20261001. For rollback, restore the previous Compose image and the previous icon_url metadata from the database dump (no full database restore is required).

Validation: repository tests cover a configured icon URL and null fallback; both tests, changed-file lint, type check and Linux production build passed. Runtime image loading is checked in the browser.
