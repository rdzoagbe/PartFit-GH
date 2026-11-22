#!/usr/bin/env bash
# Applies the PartFit migrations to a throwaway Postgres and runs the SQL tests.
#
#   DATABASE_URL=postgres://user:pass@host:5432/postgres ./scripts/db-test.sh
#
# backend/tests/00-harness.sql stands in for the parts of Supabase the
# migrations touch (auth.users, auth.uid(), the anon/authenticated roles), so
# the real backend/*.sql files run unmodified. Any FAIL line fails the run.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a throwaway Postgres}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)

apply() { echo "-- applying $1"; "${PSQL[@]}" -f "$HERE/$1"; }

# 00-harness.sql provides a pg_cron stand-in (cron.job / schedule / unschedule),
# so the one line that installs the real extension is dropped here. Everything
# else in the file — including which function the job calls — is applied as-is.
apply_cron() {
  echo "-- applying backend/reservation-expiry-cron.sql (pg_cron stubbed)"
  sed '/create extension if not exists pg_cron/d' "$HERE/backend/reservation-expiry-cron.sql" | "${PSQL[@]}" -f -
}

run_suite() {
  local suite="$1" out
  echo "== $suite"
  out="$("${PSQL[@]}" -v setup_all="$HERE/backend/setup-all.sql" -f "$HERE/$suite" 2>&1 || true)"
  echo "$out" | grep -E "PASS|FAIL|ERROR" || true
  if echo "$out" | grep -qE "FAIL|ERROR"; then echo "FAILED: $suite"; return 1; fi
}

fail=0
for suite in backend/tests/10-order-delivery-contact.sql backend/tests/11-stock-payment-expiry.sql backend/tests/12-payment-safety.sql backend/tests/13-migration-order.sql; do
  # each suite gets a clean schema
  "${PSQL[@]}" -c 'drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; drop schema if exists cron cascade;'
  apply backend/tests/00-harness.sql
  apply backend/setup-all.sql
  apply backend/momo-paystack.sql
  apply backend/order-integrity.sql
  apply backend/payment-safety.sql
  apply_cron
  run_suite "$suite" || fail=1
done
[ "$fail" -eq 0 ] && echo "All database tests passed." || { echo "Database tests FAILED."; exit 1; }
