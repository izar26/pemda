# ==========================================
# Stage 1: Build Frontend Single Page App
# ==========================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app

# Enable pnpm v9 matching lockfile version 9.0
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy dependency manifests for caching
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy frontend source and build
COPY frontend/ ./

ARG VITE_API_BASE_URL=/api
ARG VITE_TURNSTILE_SITE_KEY=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}

RUN pnpm run build

# ==========================================
# Stage 2: Production Nginx Server
# ==========================================
FROM nginx:alpine

COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
