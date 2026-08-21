# Build stage — uses Node 22 to match Angular CLI requirements.
FROM node:22-alpine AS builder

WORKDIR /app

COPY ui/package.json ui/package-lock.json* ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

COPY ui/ ./

RUN npm run build -- --configuration production

# Runtime stage — Nginx serves the static PWA.
FROM nginx:1.27-alpine

COPY ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/statistiloto-ui/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
