# NAS archive theme

Visual reference: [LBEILC / RhineLabUI](https://github.com/LBEILC/RhineLabUI), particularly its warm paper background, ink typography, amber selection signal, fine rules and architectural archive composition. The adaptation is original CSS and SVG; no upstream model, logo, font, sound, animation engine or source code is redistributed.

The server enables `data-style="rhine"` on the document when `HOMEIO_NAS_MODE=true`. Document scope also covers Radix portal dialogs, menus and toast notifications. NAS components use semantic surface, text, border and status tokens instead of literal dark colors. The desktop uses a static local SVG archive background; it adds no dependencies or canvas rendering. Existing wallpaper/accent/radius preferences remain stored, but the NAS theme supplies a fixed palette and geometry for predictable readability.

Body text uses Inter with PingFang SC / Microsoft YaHei / system fallbacks for Chinese. Table text is 14px, supporting NAS labels are at least 13px, and form controls have a 40px minimum height (44px on coarse pointers). Scrollbars, focus outlines, native light form controls, reduced-motion support and browser zoom are available. Long tables scroll horizontally rather than shrinking their contents.

Calculated solid-color contrast against the reading surface `#faf8f4`: body text 14.39:1, secondary text 6.00:1, gold links 4.69:1, green status 6.65:1, warning text 6.19:1 and error text 6.67:1. White primary button text against gold is 4.97:1. These palette checks are not a claim of complete WCAG certification; rendered interfaces still need visual review.

This change only affects presentation. TrueNAS RPC policies, operation previews, confirmations, VM navigation and file mount permissions are retained.

## Deployment and verification

Deployed 2026-10-01 as `homeio-local:1.9.6-truenas.7`, immutable image `sha256:78e79def2ed0e6806f89bdd7e5a716f969ba1da2ef463830f5297c32c0028325`. Pre-theme rollback Compose: `/mnt/maindata/apps/homeio/backups/pre-rhine-20261001/compose.yaml`.

22 focused tests, TypeScript, ESLint and Linux production build passed. Live API reads, 20 concurrent reads, VM preview and same-origin rejection passed; no production management mutations were executed by the acceptance test. Original session, 11 launchers and file contents survived. Three containers are healthy, SMB/ACL are unchanged and the movie/downloads mounts remain read-only.

Browser verification covered NAS overview, storage table, desktop settings and modal dismissal. At 390px viewport the document is 390px wide while the 727px table scrolls inside a 349px container. A zero-width inherited dialog close control was fixed to a visible 40px square button; dismissal was verified. The palette check does not certify every existing desktop icon or external application.
