#!/usr/bin/env bash
set -euo pipefail

db_url="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
timestamp="$(date +%Y%m%d_%H%M%S)"
report_dir="reports"
report_path="${report_dir}/verify_db_${timestamp}.txt"

mkdir -p "${report_dir}"

echo "Connection target: ${db_url}"
echo "Report path: ${report_path}"

psql "${db_url}" -v ON_ERROR_STOP=1 -f "sql/verify_core.sql" | tee "${report_path}"
