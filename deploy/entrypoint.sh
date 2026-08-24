#!/bin/sh
set -e

# Prepare Laravel's writable dirs and ensure the SQLite database file exists.
# database/database.sqlite is the mounted volume (see docker-compose.yml): on
# first boot the file is created here; on later boots it persists. Ownership
# is handed to www-data (the php-fpm user) so both nginx static serving and
# fpm writes work.

mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs

# A bind mount of a non-existent file is created by Docker as a *directory*.
# That's a setup mistake, not a recoverable state — fail loudly.
if [ -d database/database.sqlite ]; then
  echo "ERROR: database/database.sqlite is a directory." >&2
  echo "Create an empty file at deploy/data/database.sqlite, then restart." >&2
  exit 1
fi

touch database/database.sqlite
chown -R www-data:www-data storage bootstrap/cache database

# Apply pending migrations (idempotent — no-op on subsequent boots).
php artisan migrate --force --no-interaction

# Hand off to supervisord (nginx + php-fpm).
exec supervisord -n -c /etc/supervisor/supervisord.conf