# SDD v3.5 — Spec Driven Development · MetodologIA Edition

> **SDD by MetodologIA** — Spec Driven Development with Neo-Swiss branding.
> Specification-driven development with cryptographic BDD verification + ambient intelligence.
> Plugin path: `./mao-sdd/`

---

## Quick Start

```
/sdd:tour              # Guided onboarding tour (8 steps)
/sdd:demo              # Generate demo project + dashboard
/sdd:init              # Initialize a real project
/sdd:menu              # Command palette — all commands
```

## Plugin Resolution

All SDD commands and skills resolve relative to `./mao-sdd/`:
- **Commands**: `./mao-sdd/commands/sdd-*.md`
- **Skills**: `./mao-sdd/skills/sdd-*/SKILL.md`
- **Scripts**: `./mao-sdd/scripts/sdd-*.sh` and `./mao-sdd/scripts/sdd-*.js`
- **References**: `./mao-sdd/references/`
- **Templates**: `./mao-sdd/references/templates/`

## Pipeline State

- Context: `./.specify/context.json`
- Dashboard: `./.specify/index.html` (serve with `npx serve .specify/ -p 3001`)
- Features: `./specs/<feature-name>/`

## SDD Pipeline Commands

| Phase | Command | Alias | Description |
|-------|---------|-------|-------------|
| Init | `/sdd:core` | `/sdd:init` | Project init, status, feature selection |
| 0 | `/sdd:00-constitution` | — | Governance principles |
| 1 | `/sdd:01-specify` | `/sdd:spec` | User stories, FR, SC from natural language |
| 2 | `/sdd:02-plan` | `/sdd:plan` | Architecture, data model, API contracts |
| 3 | `/sdd:03-checklist` | `/sdd:check` | BDD Analysis — **[GATE G1]** |
| 4 | `/sdd:04-testify` | `/sdd:test` | Gherkin BDD scenarios with assertion hashing |
| 5 | `/sdd:05-tasks` | `/sdd:tasks` | Dependency-ordered task breakdown |
| 6 | `/sdd:06-analyze` | `/sdd:analyze` | Cross-artifact consistency — **[GATE G2]** |
| 7 | `/sdd:07-implement` | `/sdd:impl` | Execute implementation — **[GATE G2]** |
| 8 | `/sdd:08-issues` | `/sdd:issues` | Export to GitHub Issues — **[GATE G3]** |

## Intelligence & Utilities

| Command | Description |
|---------|-------------|
| `/sdd:sentinel` | Full sentinel cycle |
| `/sdd:insights` | Health trends, risks |
| `/sdd:graph` | Knowledge graph with orphan detection |
| `/sdd:qa` | QA plan with DoD |
| `/sdd:dashboard` | Generate ALM Command Center |
| `/sdd:workspace` | Per-task workspace sessions |
| `/sdd:capture` | RAG memory capture |
| `/sdd:verify` | Run verification suite |

## Windows/PowerShell Adaptation

Scripts are primarily bash. On Windows, use Node.js generators directly:
```powershell
$sdd = ".\mao-sdd\scripts"
node "$sdd\generate-dashboard.js" "."
node "$sdd\sdd-qa-plan.js" "."
node "$sdd\sdd-insights.js" "." --snapshot
node "$sdd\sdd-knowledge-graph.js" "."
node "$sdd\generate-command-center-data.js" "."
```

## Brand: Neo-Swiss Clean and Soft Explainer

| Token | Valor |
|-------|-------|
| Body | `#1F2833` (charcoal) |
| Surfaces | `#122562` (navy) |
| Gold | `#FFD700` (accents, CTAs) |
| Blue | `#137DC5` (never green) |
| Lavender | `#BBA0CC` (secondary text) |
| Gray | `#808080` (muted, disabled) |
| Cards | Glassmorphism `blur(16px) saturate(180%)` |

---

*SDD v3.5 · Spec Driven Development · by MetodologIA*
