# car-log — single image serving the API and the built PWA.
#
# Stage 1 builds the Angular PWA, Stage 2 installs Composer deps, Stage 3 is
# the runtime: nginx + php-fpm (supervised) with the PWA copied into the
# Laravel public dir, so one container answers both /api/* and the SPA.
#
# Build context is the repo root (see deploy/docker-compose.yml).

# ---------- Stage 1: build the Angular PWA ----------
FROM node:26-alpine AS web-build
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build -- --configuration production
# Output: /web/dist/web/browser

# ---------- Stage 2: Composer dependencies ----------
FROM php:8.5-cli AS api-deps
WORKDIR /var/www/html
RUN apt-get update && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY api/ ./
RUN composer install --no-dev --prefer-dist --optimize-autoloader

# ---------- Stage 3: runtime (nginx + php-fpm) ----------
FROM php:8.5-fpm AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends nginx supervisor curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=api-deps /var/www/html /var/www/html
COPY --from=web-build /web/dist/web/browser /var/www/html/public

COPY deploy/nginx.conf /etc/nginx/sites-available/default
COPY deploy/www.conf /usr/local/etc/php-fpm.d/www.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/app.conf
COPY deploy/entrypoint.sh /usr/local/bin/entrypoint

RUN chmod +x /usr/local/bin/entrypoint \
    && mkdir -p /var/www/html/storage/framework/cache/data \
               /var/www/html/storage/framework/sessions \
               /var/www/html/storage/framework/views \
               /var/www/html/storage/logs \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

WORKDIR /var/www/html
EXPOSE 80

ENTRYPOINT ["entrypoint"]