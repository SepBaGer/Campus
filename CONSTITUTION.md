# Campus Repository Constitution

This file extends the governing rules from
`tools/jm-adk/references/ontology/constitution-v6.0.0.md` with repo-local
constraints for Campus.

## 1. Product Boundary

`campus-platform/` is the active product surface. Product behavior, deploy
logic, and Supabase-facing code live there or in its immediate documentation.

`campus-v2/` is a previous version kept only as vestigial fallback/rollback.
It must remain readable and buildable, but it is not the active target for new
product or backend work unless a task explicitly asks for rollback maintenance.

## 2. Framework Boundary

`tools/jm-adk/` is inherited governance, not an incidental utility folder. Do
not edit it unless the task is explicitly about the framework itself.

## 3. Runtime Explicitness

Codex is the canonical operating path for this repository. Claude Desktop is a
supported secondary runtime and must use the repo-local desktop contract instead
of inventing parallel behavior.

## 4. Local State Stays Local

`workspace/`, `session-state.json`, local overlays, generated artifacts, and
operator-specific config must not be treated as product source.

## 5. No Secrets In Git

Tracked files may describe required configuration, but they must not contain
real credentials, tokens, cookies, SMTP secrets, or private keys.

## 6. Evidence Before Claim

Runtime readiness, repo readiness, and behavior changes must be backed by a
proportional check: code inspection, tests, build validation, or doctor scripts.

## 7. Remote-First Clarity

The Campus app must not silently pretend local infrastructure exists when the
intended runtime is remote. Config templates may describe local/demo behavior,
but defaults must remain explicit.

## 8. Indexability

Every top-level operational directory must remain navigable through a local
`README.md`. New repo-operational directories must ship with their own index.
