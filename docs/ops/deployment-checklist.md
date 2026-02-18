# Deployment Checklist (Ops)

## Secret presence and scope
- Verify all required env vars exist in target environment:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `APP_BASE_URL`
  - `EMAIL_PROVIDER_KEY`
  - `UPLOAD_SIGNING_KEY`
  - `UPLOAD_MAX_MB`
  - `METADATA_TIMEOUT_MS`
- Confirm service-role keys are server-only and not exposed to client bundles.

## Pre-deploy validation
- Confirm latest rotation log entries include actor and timestamp.
- Verify one-time reveal events for newly issued secrets were consumed once.
- Confirm log redaction rules are active for sensitive key names.

## Post-deploy checks
- Run smoke calls with correlation ID headers for reserve and contribute endpoints.
- Verify metadata fetch rejects blocked/private-network URLs.
- Verify upload API rejects over-limit files and returns signed preview URL for valid files.
- Confirm no raw secrets appear in structured logs.

## Rollback gate
- If auth or delivery regressions occur, rollback and rotate impacted key immediately.
