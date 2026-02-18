status: done
id: S-05
topic: brief.md
title: Uploads, previews, and metadata limits
Preconditions (P0s): none
Changes: upload validation pipeline; storage paths for avatar/cover/item images; `/api/metadata/fetch` hardening
Steps:
- Add shared client/server file validation for type and 10MB cap.
- Define storage paths and signed-access model per asset type.
- Build image upload with preview and replace behavior.
- Implement URL metadata fetch endpoint contract.
- Enforce SSRF allow/deny rules and timeout window.
- Add graceful fallback when metadata extraction fails.
- Persist fetched title/image/price as editable draft values.
- Add tests for oversized files and timeout failures.
Design focus:
- Upload affordances are clear on mobile and desktop.
- Preview states do not block manual edits.
- Metadata failure path still supports fast item creation.
Tech focus:
- Validation is mirrored client and server side.
- Storage writes are scoped to authorized user/list context.
- Metadata fetch is timeout-bounded and SSRF-safe.
- Fallback path preserves user-entered fields.
SQL?: none
Env?: `UPLOAD_MAX_MB` (10 default), `METADATA_TIMEOUT_MS` (3000-5000 default)
Acceptance:
- Files larger than 10MB are rejected before write.
- Valid uploads persist and display preview URLs.
- Metadata fetch timeout returns controlled error shape.
- Blocked URLs fail safely without internal network access.
- Manual item entry remains available after fetch failure.
- Uploaded assets are not accessible outside policy scope.
Debts:
- Add image compression optimization later.
