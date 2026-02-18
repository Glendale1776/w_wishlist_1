# Secrets Runbook

## Inventory and owners
- `SUPABASE_URL` (Owner: Platform) - project endpoint; low sensitivity but environment-scoped.
- `SUPABASE_ANON_KEY` (Owner: Platform) - public client key; rotate with API deploy.
- `SUPABASE_SERVICE_ROLE_KEY` (Owner: Security) - privileged key; never exposed to client or browser logs.
- `APP_BASE_URL` (Owner: Web) - canonical base URL for links and metadata.
- `EMAIL_PROVIDER_KEY` (Owner: Comms) - transactional delivery key for invite/notification mail.
- `UPLOAD_SIGNING_KEY` (Owner: Security) - signs preview URLs for uploaded files.

## Generation and storage workflow
- Generate secrets only from approved providers and capture actor + timestamp in the rotation log.
- Store runtime values only in environment secret managers (Vercel/Supabase); do not commit real values to git.
- Store emergency recovery values in an encrypted password vault with at least two maintainers.
- Share new sensitive secrets using the one-time reveal flow in `docs/ops/one-time-reveal.md`.

## Rotation policy
- Standard cadence: every 90 days for privileged keys; every 180 days for low-risk config keys.
- Immediate rotation triggers: suspected leak, employee offboarding, failed delivery due to auth rejection.
- Rotation order: issue new secret -> deploy with dual-read if possible -> verify health -> revoke old secret.
- Every rotation entry records: secret label, actor, issued timestamp, revoked timestamp, incident/reference ID.

## Emergency rotation path
- Open incident channel and assign Security (lead) + Platform (executor).
- Freeze deployments touching auth/integration code until replacement key is validated.
- Rotate key, redeploy, and verify reserve/contribute and email delivery endpoints with correlation IDs.
- Revoke previous key, then post-mortem with scope + remediation.

## Log redaction rules
- Never log raw values for fields matching `secret|token|key|password|authorization|cookie|sig`.
- Only log references: secret label, actor, environment, correlation ID.
- Error payloads sent to clients must be typed and generic; no provider internals or credentials.
