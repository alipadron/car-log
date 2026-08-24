#!/bin/sh
set -e

# Prepare Laravel's writable dirs and ensure the SQLite database file exists.
# data/database.sqlite lives on the mounted volume (see docker-compose.yml):
# on first boot the file is created here; on later boots it persists.
# Ownership is handed to www-data (the php-fpm user) so both nginx static
# serving and fpm writes work.

mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs \
         data

# A bind mount of a non-existent path is created by Docker as a *directory*.
# That's a setup mistake, not a recoverable state — fail loudly.
if [ -d data/database.sqlite ]; then
  echo "ERROR: data/database.sqlite is a directory." >&2
  echo "Remove it, then restart." >&2
  exit 1
fi

touch data/database.sqlite
chown -R www-data:www-data storage bootstrap/cache database data

# Apply pending migrations (idempotent — no-op on subsequent boots).
php artisan migrate --force --no-interaction

# Hand off to supervisord (nginx + php-fpm).
exec supervisord -n -c /etc/supervisor/supervisord.conf