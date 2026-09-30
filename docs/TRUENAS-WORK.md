# TrueNAS management conversion — 2026-10-01

User explicitly chose full management: disks, ZFS, permissions and network included.
Preserve Chinese work, existing services/data and deployment rollback. No destructive
production test operations. Use official 25.10 JSON-RPC API over verified TLS, not
host Docker socket or shell commands exposed through Homeio.

Implementation: NAS-mode home page with dedicated overview and resource panels,
curated supported API operation catalog and typed schema-driven forms. Require
administrator session, same-origin writes, fresh password confirmation, expiring
one-use preview tokens and an audit trail. Track long-running jobs accurately.
Network interface changes must preserve TrueNAS rollback/checkin workflow.

Remove irrelevant Homeio host controls from default NAS UI. Keep original desktop
source and a separate route for Files/appearance/service bookmarks. Distinguish
TrueNAS-managed apps from external service links. Collapse unused NFS/cloud
features instead of deleting their configurations.

Inventory: TrueNAS 25.10.6; maindata ONLINE; five disks; five TrueNAS custom apps;
four SMB shares; no NFS/VM/replication/cloudsync tasks; one snapshot schedule and
four cron tasks; bonded network. Existing Homeio has no real host management.

Implemented and deployed: 23 resource panels and 86 curated API operations. VM
and VM device management remain primary navigation. Existing scrub schedules also
remain primary; unused NFS, replication and cloud sync are collapsed under More.

API credentials live only on the NAS in a read-only secret file, mode 0600,
owned by UID 1001. Certificate fingerprint verification happens before sending
credentials. The server reuses an authenticated connection with separate RPC IDs
per request; idle connections close after five minutes. Failed/timed-out writes
are never automatically replayed. Each HTTP request still checks the Homeio
administrator allowlist. Key expiration: 2027-01-01 00:00 UTC.

Validation: 19 focused tests, TypeScript and ESLint passed. Linux production build
and isolated temporary-database smoke test passed. All 23 live read resources,
20 concurrent reads, VM preview and cross-origin rejection passed through the
deployed gateway. Browser verified overview, datasets and VM creation preview.
No NAS mutation was executed through the panel during acceptance. Production
deployment itself updated only Homeio's app configuration.

Final image: homeio-local:1.9.6-truenas.2
sha256:509390f376825a605ba0dead2472a2672a5f161b9ec64df1866f0565e8bd31ee
Rollback baseline: /mnt/maindata/apps/homeio/backups/pre-truenas-20261001
Second build backup: /mnt/maindata/apps/homeio/backups/pre-truenas-20261001-2
Restore the first backup's compose.yaml via the native Custom App editor to return
to the prior i18n desktop. A UI rollback does not require restoring the database.

Confirmed preserved: prior session, 11 service bookmarks, persistence marker,
movie/downloads read-only mounts, original SMB configuration and ACLs. All three
Homeio containers healthy, no Docker socket, host network or privileged mode.

Scope limits: this is the core NAS management panel, not full native UI parity.
VM console, certificate management, OS upgrades, boot environment/config backup
workflows and catalog installation wizard still use the linked native TrueNAS UI.
Snapshots currently list up to 200, jobs up to 100. Native errors, enumerations and
advanced schema help can remain English. No destructive production write or
whole-NAS reboot/restore test was performed. Files retain earlier upload/download
limitations; this change does not rewrite that subsystem.

User explicitly requested VMs stay in primary navigation.
