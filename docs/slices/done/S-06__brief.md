status: done
id: S-06
topic: brief.md
title: Secrets lifecycle and operational observability
Preconditions (P0s): none
Changes: secrets runbook; rotation process; one-time reveal workflow; structured logging and delivery/support docs
Steps:
- Define required secrets inventory and ownership map.
- Document generation and secure storage workflow.
- Define rotation cadence and emergency rotation path.
- Implement one-time reveal process for newly issued secrets.
- Add redaction rules for logs and error payloads.
- Define correlation ID usage across API and background paths.
- Add support playbook for investigating claim/contribution incidents.
- Add deployment checklist to verify secret presence and scope.
Design focus:
- Internal ops UI/docs remain concise and actionable.
- Incident steps are easy to execute under time pressure.
- Support checklist maps cleanly to user-facing states.
Tech focus:
- Secrets are never printed in logs or client payloads.
- Rotation steps are auditable with timestamps and actor.
- Observability covers success, validation, conflict, and internal failures.
- Docs define ownership for each secret and escalation path.
SQL?: none
Env?: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_BASE_URL`, `EMAIL_PROVIDER_KEY`
Acceptance:
- Runbook lists all required secrets and owners.
- Rotation procedure is executable without downtime assumptions.
- One-time reveal flow is documented and test-run once.
- Log redaction rules verified against sample failure traces.
- Support playbook covers stale claims and pledge disputes.
Debts:
- Automate secret expiry reminders later.
