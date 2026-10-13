# syntax=docker/dockerfile:1
#
# One image for every deployed environment (openspec/changes/make-app-portable).
# Built with DB_ADAPTER=postgres and STORAGE=s3; every secret and connection
# setting is read when the container starts (see .env.example), so the same
# image moves from staging to production unchanged.
#
#   docker build -t vvf-site .                  # the site (target: runtime)
#   docker build -t vvf-tools --target tools .  # migrations, seeding, media copy
#
# The runtime image holds only the built server, production dependencies and
# the launcher: no source tree, tests, .env, local database or child data.

ARG NODE_VERSION=22

# --- all dependencies (build + tools) ----------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build; also the tools image (emdash migrate, db:setup, media:copy) -----
FROM deps AS tools
COPY . .
ARG DB_ADAPTER=postgres
ARG STORAGE=s3
ENV DB_ADAPTER=${DB_ADAPTER} STORAGE=${STORAGE}
RUN npx astro build
CMD ["npm", "run", "db:setup"]

# --- production dependencies only ---------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runtime -------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG DB_ADAPTER=postgres
ARG STORAGE=s3
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    DB_ADAPTER=${DB_ADAPTER} \
    STORAGE=${STORAGE}
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=tools --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node scripts/start.mjs ./scripts/start.mjs
USER node
EXPOSE 4321
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "scripts/start.mjs"]
