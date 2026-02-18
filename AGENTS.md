# AGENTS.md

## Scope
- This file defines the planning and execution rules for Codex in this repository.

## Slice storage model
- Pending slices live in `docs/slices/pending/`.
- Done slices live in `docs/slices/done/`.
- Slice filenames MUST be: `S-<NN>__<topicToken>.md` (example: `S-07__brief3.md`).
- `topicToken` = Active brief basename (`brief3.md` -> `brief3`; `brief.md` -> `brief`).

## Active topic routing
- Active brief = highest `docs/briefN.md` else `docs/brief.md`.
- Active topic id = Active brief filename (example: `brief3.md`).
- Active topic token = basename without `.md` (example: `brief3`).
- Active slice selection (no scanning): list `docs/slices/pending/` filenames.
- Consider ONLY files matching `S-XX__<activeTopicToken>.md`.
- Active slice = lowest numeric `XX` among matching files.
- Do not open done slices.
- Do not open pending slices for other topic tokens.

## Source of truth order
- Active brief > `docs/technical.md` > `docs/design.md` > active slice > `docs/{scope,routes,ui_ux,acceptance,data_model}.md`.
- Open questions = `docs/open_questions.md` (proposed answers) and `docs/questions.md` (open index).
- Refs index = `docs/refs.md`; open referenced files only when Active brief lists their Ref IDs.

## What to ignore
- Do not scan `docs/locks` history; read latest lock only (if needed).
- Do not scan `docs/_archive/**` unless explicitly referenced by Ref ID.
- Do not open done slices unless explicitly referenced by the Active slice or Active brief.

## Workflow
- `plain_brief.md` usage: first run creates global `docs/brief.md`; after that, `plain_brief.md` is feature-delta only.
- Never put process notes in `plain_brief.md`.
- Planning: run Prompt 2 to write active-topic specs + create new slices for the active brief (in `pending/`).
- Implementation: run Prompt 3; implement exactly one slice (active slice) then stop.
- After implementation, move the slice file from `pending/` to `done/`.
- Git: main only; no branches.
- Drift fix: commit code -> write lock -> amend commit (lock sha == HEAD).
- Expected manual edits (never block): after Prompt 1, user may update Active brief `§Decisions` and may empty `docs/open_questions.md`.
- Expected manual edits (never block): after Prompt 2, user may answer `docs/questions.md` and may update Active brief `§Decisions`.
- Treat current on-disk planning docs as source of truth; do not ask to restore prior versions.
- Repo hygiene (noise must never block): ensure `.gitignore` covers `.DS_Store`, `**/.DS_Store`, `docs/drift/`.
- Repo hygiene (noise must never block): these files are never staged/committed.
- Repo hygiene (noise must never block): if tracked in git, remove from index and delete locally.

## Checks
- `npm run typecheck`
- `npm run build`
