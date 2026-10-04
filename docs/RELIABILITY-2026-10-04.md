# Homeio / TrueNAS reliability baseline

This fork retains `codex/homeio-zh-cn` as the development branch. Its upstream baseline is Homeio 1.9.6; TrueNAS integration targets 25.10.6. Dependencies, storage configuration and existing translations are retained.

## Behavior

- Browser multipart filenames are decoded as UTF-8. Downloads use an ASCII `filename` fallback and RFC 5987 `filename*`. Interrupted uploads remove only files exclusively created by the upload; duplicates are drained and preserved. Reported sizes come from completed files.
- The gateway retains its 64 MiB request cap. The client allows at most 63 MiB of file content per batch, leaving room for multipart overhead. It explains the limit and handles HTML 413 responses; large files use SMB.
- Overview responses identify failed methods. The client marks missing values unknown and cached values stale, preserving available sections.
- Accepted job IDs are tracked individually until success, failure or abort. Tracking survives settings navigation and a tab reload through session storage. A lost write response is explicitly uncertain and is never automatically resubmitted.
- Snapshots and jobs use bounded server-side search, count, pagination and stable ordering. Job details exclude raw results and secret fields.
- Dataset, SMB and VM updates show current values against the explicitly submitted patch. App start/stop previews show state changes. Relevant before-state hashes remain inside encrypted one-use intents and are rechecked before writing. Other operations explicitly mark unavailable before values; a preview is not a TrueNAS dry run.
- Common dataset/SMB/VM fields appear first; advanced schemas remain available. Chinese and English labels, error states and units are maintained together. The light Rhine layout and unified settings navigation are retained.

## Verification and deployment

`Fork verification` runs lint, production type checking, all unit tests and a production build on development pushes and pull requests. It neither publishes images nor deploys the NAS.

Local Windows checks cover API boundaries, previews, task feedback, pagination and upload limits. Linux verifies real file service behavior, including symlinks, all unit tests and the standalone production build. Host-dependent tests use explicit filesystem times, network fixtures and bounded waits rather than assuming host privileges or execution speed.

Production acceptance reads every NAS resource, checks filtered pages and individual jobs, generates an app state preview without executing it, and verifies a Chinese upload/download in a new Homeio test directory. Existing `movie` and `downloads` mounts stay read-only. Failure and uncertainty paths are tested with mocks; production acceptance does not perform destructive operations to simulate them.

No database migration is needed. Deployment retains the old image and first backs up compose, gateway configuration and a verified PostgreSQL dump. A failed health check restores the old compose automatically. UI rollback uses the previous image and compose; it does not restore the database over current data.
