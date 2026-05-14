# ── Stage 1: build ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: serve ──
FROM nginx:alpine
RUN apk add --no-cache gettext

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf.template
COPY nginx/config.json.template /etc/config.json.template

# envsubst replaces ${ABS_HOST} and ${ABS_EXTERNAL_URL} at container start
CMD ["/bin/sh", "-c", \
  "envsubst '${ABS_HOST}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && \
   envsubst '${ABS_EXTERNAL_URL}' < /etc/config.json.template > /usr/share/nginx/html/config.json && \
   nginx -g 'daemon off;'"]
