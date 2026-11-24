#!/usr/bin/env bash
# Apply the attribute catalogue, basic forms and variants update to a database.
#
# Run from a machine that can reach the database (Render's external URL), with the same
# DB_* settings the API uses. NODE_ENV=production turns on SSL like the API does:
#
#   NODE_ENV=production DB_HOST=<external host> DB_PORT=5432 \
#   DB_NAME=<name> DB_USER=<user> DB_PASSWORD=<password> \
#   scripts/apply-catalogue-update.sh
#
# Steps (each is idempotent, so the script can be re-run after a failure):
#   1. app migrations (listing variants, sub_categories.variant_axes, ...)
#   2. taxonomy sync: basic forms + variant axes per sub-category (admin-customised forms kept)
#   3. catalogue schema migration 4 (attribute dictionary, attribute sets, item families)
#   4. catalogue loads: attribute-sets, jan-aushadhi and off-india (new attribute keys)
#   5. product families, then sub-category ↔ catalogue links
# Needs network access to the Open Food Facts API and pib.gov.in for step 4.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DB_HOST:?Set DB_HOST (and DB_NAME, DB_USER, DB_PASSWORD, DB_PORT)}"
echo "Database: ${DB_USER:-?}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME:-?} (NODE_ENV=${NODE_ENV:-development})"

[ -d node_modules ] || npm install --no-audit --no-fund
[ -d catalog/node_modules ] || npm run catalog:install

echo "== 1/5 app migrations"
npx sequelize-cli db:migrate

echo "== 2/5 taxonomy sync (basic forms, variant axes)"
npm run taxonomy:sync

echo "== 3/5 catalogue schema"
(cd catalog && node cli.js migrate)

echo "== 4/5 catalogue loads"
export NODE_USE_ENV_PROXY="${NODE_USE_ENV_PROXY:-1}"
(cd catalog && node cli.js run attribute-sets && node cli.js run jan-aushadhi && node cli.js run off-india)

echo "== 5/5 families and links"
(cd catalog && node cli.js families)
npm run catalog:link-sub-categories

(cd catalog && node cli.js status)
echo "Done."
