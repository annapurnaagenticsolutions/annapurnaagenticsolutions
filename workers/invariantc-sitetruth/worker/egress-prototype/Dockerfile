FROM node:24.15.0-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1000 probe \
    && useradd --uid 1000 --gid 1000 --no-create-home --shell /usr/sbin/nologin probe

COPY --chown=1000:1000 probe.mjs /app/probe.mjs

# The Durable Object starts a root entrypoint to install Cloudflare's runtime
# interception CA, then executes the fixed probe as UID/GID 1000.
CMD ["sleep", "infinity"]
