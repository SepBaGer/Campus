# Campus Claude Desktop Contract

This file defines the desktop-oriented runtime contract for this repository.
`tools/jm-adk/CLAUDE.md` remains the framework-level reference; this file narrows
that guidance to Campus-specific boundaries and workflows.

## Startup Order

1. Read `profiles/capabilities/capability-manifest.json`.
2. Read `profiles/desktop/claude_desktop_config.template.json`.
3. Read `profiles/claude/settings.template.json`.
4. Read `AGENTS.md` for the Codex-side contract and shared repo boundaries.
5. Read `CONSTITUTION.md`.
6. Read `tools/jm-adk/PRISTINO.md`.
7. Read `tools/jm-adk/references/ontology/constitution-v6.0.0.md`.
8. Read `tools/jm-adk/PRISTINO-INDEX.md`.
9. If `.jm-adk.json` exists, read it and then recover the active workspace files
   from `workspace/<active>/`.
10. If the task touches the active product, orient in `campus-platform/` and
    then `campus-platform/supabase/` for backend contracts before editing.
11. If the task touches `mao-sdd/`, treat it as a separate bounded area and do
   not mix changes silently with Campus work.

## Runtime Rules

- Desktop workflows are supported, but the governing framework still lives in
  `tools/jm-adk/`.
- Degrade missing desktop-only capabilities explicitly instead of faking them.
- Use repo-local docs and contracts before importing patterns from external
  repositories.
- Keep active product work in `campus-platform/`, backend work in
  `campus-platform/supabase/`, and task-local artifacts in `workspace/`.

## Placement Rules

- `campus-platform/` is the canonical Campus product surface.
- `campus-platform/supabase/` contains the active Supabase assets and remote
  backend contract for Campus Platform.
- `campus-v2/` is a vestigial backup frontend and should only receive explicit
  fallback or archival work.
- `campus-v2/supabase/` is only a compatibility pointer plus possible local CLI
  state from earlier runs.
- `tools/jm-adk/` is framework source and should only change when the task is
  explicitly about JM-ADK itself.
- `workspace/` is local task state, plans, logs, and generated artifacts.
- `mao-sdd/` is adjacent reference material and should not be edited unless the
  task clearly includes it.

## Change Discipline

- When runtime behavior changes, update the contract docs in the same pass.
- When app behavior changes, update code plus the closest deploy/runbook docs.
- Prefer the simplest local contract that clarifies behavior for future agents.

## Definition Of Done

- The affected runtime path is explicit for the environment being used.
- Product, framework, workspace, and adjacent-reference boundaries stay clear.
- Any changed product behavior is validated with the narrowest useful check.
- Docs stay aligned with the actual operating path for this repository.
- The repo-local doctor or equivalent validation path is still coherent after
  the change.
- Daily validation should center on `campus-platform`; `campus-v2` rollback
  validation should be explicit rather than implicit.
