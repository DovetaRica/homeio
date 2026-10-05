FROM ghcr.io/doctor-io/homeio@sha256:910d36f9ea15aeff54abf874dd630f253884502a0f2638e522ff4bb400168520
ARG HOMEIO_REVISION
LABEL org.opencontainers.image.title="Homeio TrueNAS management" \
      org.opencontainers.image.version="1.9.6-truenas.19" \
      org.opencontainers.image.revision=$HOMEIO_REVISION
# Replace generated output; the base image can contain dependency symlinks
# at paths where the new standalone build has directories.
RUN rm -rf /app/.next
COPY --chown=1001:1001 .next/standalone/.next/ /app/.next/
COPY --chown=1001:1001 .next/standalone/node_modules/ /app/node_modules/
COPY --chown=1001:1001 .next/static/ /app/.next/static/
COPY --chown=1001:1001 dist-server/ /app/dist-server/
COPY --chown=1001:1001 public/ /app/public/
