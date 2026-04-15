# ─── Builder stage: install + build everything ───
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY . .
RUN npm run build

# ─── Runtime stage: only what's needed to run ───
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Install production deps fresh so native modules (better-sqlite3) compile for runtime arch
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --omit=dev

# Copy build artifacts
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/drizzle ./server/drizzle
COPY --from=builder /app/client/dist ./client/dist

# Strip build tools to keep image small
RUN apk del python3 make g++

RUN mkdir -p /app/data /app/uploads
VOLUME ["/app/data", "/app/uploads"]
EXPOSE 3000

ENV NODE_ENV=production
ENV DB_PATH=/app/data/devtodo.db
ENV STORAGE_PROVIDER=local
ENV PORT=3000

CMD ["node", "server/dist/index.js"]
