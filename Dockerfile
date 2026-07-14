# 1) Frontend bauen
FROM node:24-slim AS web
WORKDIR /web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# 2) Server bauen (dev-Deps für tsc)
FROM node:24-slim AS build
WORKDIR /server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# 3) Nur Produktions-Dependencies
FROM node:24-slim AS deps
WORKDIR /server
COPY server/package*.json ./
RUN npm ci --omit=dev

# 4) Runtime
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production STATIC_DIR=/app/web-dist DB_PATH=/data/dart.sqlite PORT=3000
COPY --from=deps /server/node_modules ./node_modules
COPY --from=build /server/dist ./dist
COPY --from=web /web/dist ./web-dist
COPY server/package.json ./package.json
RUN mkdir -p /data
VOLUME /data
EXPOSE 3000
# Hinweis: node:sqlite ist ab Node 24 flag-frei. Sollte eine ältere Node-Version das
# Flag verlangen, CMD auf ["node","--experimental-sqlite","dist/server.js"] setzen.
CMD ["node", "dist/server.js"]
