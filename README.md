# Workspace MetodologIA — Spec Driven Development

> **by metodolog*IA*** · Powered by SDD v3.5

## Proyectos

| Proyecto | Descripción | Estado |
|----------|-------------|--------|
| `campus-v2/` | Nueva versión del Campus MetodologIA | En desarrollo |
| `metodologia-campus/` | WordPress legacy theme | Referencia |
| `mao-sdd/` | Plugin SDD — Motor de desarrollo especificado | Activo |

## Pipeline SDD

Estado actual del pipeline: **Fase Init**

```
✓ Init → ○ Constitution → ○ Specify → ○ Plan → ○ Check → ○ Test → ○ Tasks → ○ Analyze → ○ Implement → ○ Issues
```

### Comandos Rápidos

```bash
/sdd:init              # Inicializar proyecto
/sdd:tour              # Tour guiado (8 pasos)
/sdd:menu              # Paleta de comandos
/sdd:dashboard         # Generar dashboard ALM
/sdd:status            # Estado del pipeline
```

### Dashboard ALM

El Command Center visual está desplegado en `.specify/`:

```
npx serve .specify/ -p 3001
```

10 páginas interconectadas: Hub, Pipeline, Specs, Quality, Intelligence, Workspace, Governance, Logs, Backlog, Search.

## Estructura del Workspace

```
workspace/
├── .specify/              # Estado SDD + Dashboard ALM
│   ├── context.json       # Estado del pipeline
│   ├── shared/data.js     # Datos del Command Center
│   ├── index.html         # Hub principal
│   ├── pipeline.html      # Vista de pipeline
│   ├── specs.html         # Story map
│   ├── quality.html       # Calidad + QA
│   ├── intelligence.html  # Insights + grafo
│   ├── workspace.html     # Explorador de archivos
│   ├── governance.html    # Constitución + governance
│   ├── logs.html          # Visor de logs unificado
│   ├── backlog.html       # Tablero de backlog
│   ├── search.html        # Búsqueda global
│   ├── tour.html          # Tour onboarding
│   ├── landing.html       # Página de aterrizaje
│   └── dashboard.html     # Dashboard legacy (single-file)
├── campus-v2/             # Proyecto: Campus nueva versión
├── metodologia-campus/    # WordPress legacy theme
├── mao-sdd/               # Plugin SDD (motor)
│   ├── commands/          # 43 definiciones de comandos
│   ├── scripts/           # 42 scripts (generators, gates, sentinel)
│   ├── skills/            # 12 skills SDD
│   ├── references/        # Design tokens, schemas, templates
│   ├── AGENTS.md          # Orquestador principal
│   └── CONSTITUTION.md    # Gobernanza del framework
├── GEMINI.md              # Archivo de orquestación para Antigravity
└── README.md              # Este archivo
```

## Créditos

- **Co-creadores**: Javier Montaño & Katherin Oquendo
- **Framework**: SDD v3.5 (Spec Driven Development)
- **Marca**: MetodologIA · Neo-Swiss Clean and Soft Explainer
- **Motor**: [Intent Integrity Chain / Kit](https://github.com/intent-integrity-chain/kit) (MIT)

---

*SDD v3.5 · Spec Driven Development · by MetodologIA*
