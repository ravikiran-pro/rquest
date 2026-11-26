#!/usr/bin/env bash
# Catalogue side of a release: schema, loads, families. Uses the same DB_* / DATABASE_URL
# settings as the rest of the pipeline (lib/env.js). Idempotent: safe to re-run.
#
#   catalog/scripts/apply.sh            schema + every source + dedupe + families
#   catalog/scripts/apply.sh --quick    schema + attribute-sets + families (no downloads)
#
# Needs network access to the sources' hosts (Open Facts, pib.gov.in, ...) unless --quick.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d node_modules ] || npm install --no-audit --no-fund
export NODE_USE_ENV_PROXY="${NODE_USE_ENV_PROXY:-1}"

node cli.js migrate
if [ "${1:-}" = "--quick" ]; then
  node cli.js run attribute-sets
  node cli.js families
else
  node cli.js run-all
fi
node cli.js status
