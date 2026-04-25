<!-- JM-ADK-CODEX-BOOTSTRAP -->

# Campus Codex Operating Contract

This file governs Codex-side work in this repository. `tools/jm-adk/` remains
the framework source of truth; this contract makes the Campus repo behavior
explicit so the operating model is local, predictable, and easier to audit.

## Framework Source

Use JM-ADK from `tools/jm-adk/` as the governing framework for this repository.

## Startup Order

On session start, read in order:
1. `profiles/capabilities/capability-manifest.json`
2. `profiles/codex/config.template.toml`
3. `AGENTS.md`
4. `CLAUDE.md` when present
5. `CONSTITUTION.md`
6. `tools/jm-adk/PRISTINO.md`
7. `tools/jm-adk/references/ontology/constitution-v6.0.0.md`
8. `tools/jm-adk/PRISTINO-INDEX.md`
9. `.jm-adk.json`, then the active workspace files in `workspace/<active>/`
10. If the task touches active app runtime or deploy, orient in `campus-platform/`
    and then `campus-platform/supabase/` for backend contracts and remote config

## Environment Modes

- `codex`: explicit supported operating path for this repository.
- `claude-desktop`: supported when the runtime follows `CLAUDE.md`.
- Missing desktop-only capabilities should be reported as degraded, not faked.

## Operating Rules

- Match the user's intent to the best available skill in `tools/jm-adk/skills/`.
- Apply the triad sequentially in a single response: Lead -> Support -> Guardian.
- Use evidence tags on claims: `[CODE]` `[CONFIG]` `[DOC]` `[INFERENCE]`
  `[ASSUMPTION]`
- Confidence threshold: `>= 0.95`
- Plan before code. If workspace is enabled, write the plan to the active
  workspace `plan.md`.
- Read before write. Prefer simple solutions unless complexity is justified.
- When behavior changes, update the closest contract or runbook in the same pass.
- Prefer repo-local guidance over importing full scaffolding from other repos.

## Workspace

- If `.jm-adk.json` exists, use it as the project-local workspace configuration.
- If it does not exist, operate manually and report that workspace automation is
  not configured.
- Keep plans, logs, and generated artifacts in `workspace/`, not in product
  source directories.

## Path Boundaries

- `campus-platform/` contains the canonical Campus product surface and should
  receive net-new product work by default.
- `campus-platform/supabase/` is now the active source of truth for migrations,
  seeds, Edge Functions, and remote Supabase config.
- `campus-v2/` is a vestigial backup frontend: keep it readable and deployable
  as fallback, but do not treat it as the active target for new feature work
  unless the task explicitly says so.
- `campus-v2/supabase/` is now only a compatibility stub plus possible local
  CLI leftovers (`.temp`, `.branches`); do not treat it as the active backend
  target.
- `tools/jm-adk/` is the framework source of truth.
- `workspace/` is local task state and generated artifacts.
- `mao-sdd/` is adjacent material and should only be edited when the task
  explicitly includes it.
- Do not edit `tools/jm-adk/` unless the task is to update the framework itself.

## Change Discipline

- Keep product changes, contract changes, and operational docs aligned.
- If a task changes runtime expectations, also update the relevant README or
  deploy doc.
- Prefer the `campus-platform/` + `campus-platform/supabase/` pair as the default
  product/backend operating path.
- Do not turn local-only assumptions into repository-wide guarantees.

## Definition Of Done

- The runtime path for the affected environment is explicit.
- Product, framework, workspace, and adjacent-reference boundaries remain clear.
- Any changed product behavior has a proportional validation step.
- Documentation reflects the actual way this repository should be operated.
- `scripts/doctor.ps1 -Environment codex` or an equivalent narrow validation
  path can explain the repo state without hidden assumptions.
- Daily validation should focus on `campus-platform`; `campus-v2` backup checks
  can be run explicitly when a rollback path is being touched.

## Greeting

Start by confirming:
`JM-ADK mode active for this project.`
