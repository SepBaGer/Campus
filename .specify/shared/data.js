/* SDD ALM Data — Generated 2026-04-05T19:51:46.283Z */
window.DASHBOARD_DATA = {
  "isDemo": false,
  "isEmpty": {
    "features": false,
    "constitution": true,
    "workspace": false,
    "tests": true,
    "tasks": false,
    "logs": false,
    "graph": false,
    "backlog": true
  },
  "generatedAt": "2026-04-05T19:51:46.283Z",
  "project": {
    "name": "Campus"
  },
  "premise": {
    "name": "Campus"
  },
  "insights": {
    "healthScore": 82,
    "scoreHistory": []
  },
  "features": [
    {
      "id": "001-campus-replatform",
      "name": "campus replatform",
      "phase": "organize-plan",
      "spec": true,
      "plan": true,
      "tasks": true,
      "tests": false,
      "checklist": true,
      "analysis": true,
      "frCount": 24,
      "usCount": 0,
      "scCount": 28,
      "testCount": 0,
      "totalTasks": 22,
      "completedTasks": 18,
      "progress": 82,
      "status": "in_progress",
      "taskItems": [
        {
          "id": "T-1",
          "title": "T001 [US1] Configurar proyecto Supabase y provisionar DB",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-2",
          "title": "T002 [US1] Ejecutar schema SQL (profiles, levels, lessons, progress, events, comments)",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-3",
          "title": "T003 [US1] Habilitar Auth provider e integrar con profiles (Trigger post-signup)",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-4",
          "title": "T004 [US1] Aplicar políticas de RLS para restricción de acceso según membresía",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-5",
          "title": "T005 [US2] Extraer esquema DB MasterStudy y crear script exportador",
          "status": "todo",
          "frRef": null
        },
        {
          "id": "T-6",
          "title": "T006 [US2] Inicializar cliente supabase-js en Vite y testear connection",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-7",
          "title": "T007 [US2] Implementar auth.js completo (login, registro)",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-8",
          "title": "T008 [US2] Portar design system glassmorphism a style.css y asegurar paridad",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-9",
          "title": "T014 [US2] Mapear tabla wp_users a estructura profiles Supabase",
          "status": "todo",
          "frRef": null
        },
        {
          "id": "T-10",
          "title": "T009 [US3] Refactorizar store.js para mapear estado a Supabase",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-11",
          "title": "T010 [US3] Implementar componentes UI Base: Sidebar, Topbar con progreso persistente",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-12",
          "title": "T011 [US3] Desarrollar Edge Function complete-lesson (XP + Level Up logic)",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-13",
          "title": "T012 [US3] Implementar vista Aula.js: Renderizar niveles y validar guards del router",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-14",
          "title": "T013 [US3] Implementar vista Leccion.js: Player de video y navegación prev/next",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-15",
          "title": "T015 [US4] Implementar vista Ranking.js (top 50)",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-16",
          "title": "T016 [US4] Implementar vista Calendario.js y obtener records",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-17",
          "title": "T017 [US4] Desarrollar integración Stripe vista Planes.js y create-checkout",
          "status": "todo",
          "frRef": null
        },
        {
          "id": "T-18",
          "title": "T018 [US4] Implementar stripe-webhook para membresía distribuida",
          "status": "todo",
          "frRef": null
        },
        {
          "id": "T-19",
          "title": "T019 [US4] Configurar Comunidad.js con muro de posts interactivo",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-20",
          "title": "T020 [US5] Edge Function send-welcome con trigger DB Alpha-safe con Mailpit",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-21",
          "title": "T021 [US5] Ejecutar suite de verificación SDD sdd-verify all checks passed",
          "status": "done",
          "frRef": null
        },
        {
          "id": "T-22",
          "title": "T022 [US5] Deploy build a Hostinger campus .htaccess SPA fallback configurado",
          "status": "done",
          "frRef": null
        }
      ]
    }
  ],
  "constitution": null,
  "governance": {
    "principles": {
      "length": 0
    },
    "operationalLogs": {
      "tasklog": {
        "exists": true,
        "entries": 21
      },
      "changelog": {
        "exists": true,
        "entries": 16
      },
      "decisionLog": {
        "exists": true,
        "entries": 2
      }
    }
  },
  "quality": {
    "passRate": 0,
    "totalTests": 0,
    "totalFR": 24
  },
  "workspace": {
    "tree": [
      {
        "name": "specs",
        "path": "specs",
        "type": "dir",
        "children": [
          {
            "name": "001-campus-replatform",
            "path": "specs/001-campus-replatform",
            "type": "dir",
            "children": [
              {
                "name": "analysis.md",
                "path": "specs/001-campus-replatform/analysis.md",
                "type": "file",
                "size": 2845,
                "mtime": "2026-04-04T21:41:30.085Z"
              },
              {
                "name": "checklists",
                "path": "specs/001-campus-replatform/checklists",
                "type": "dir",
                "children": [
                  {
                    "name": "01-quality.md",
                    "path": "specs/001-campus-replatform/checklists/01-quality.md",
                    "type": "file",
                    "size": 1855,
                    "mtime": "2026-04-05T16:53:50.580Z"
                  },
                  {
                    "name": "checklist.md",
                    "path": "specs/001-campus-replatform/checklists/checklist.md",
                    "type": "file",
                    "size": 1855,
                    "mtime": "2026-04-05T16:53:50.580Z"
                  }
                ]
              },
              {
                "name": "plan.md",
                "path": "specs/001-campus-replatform/plan.md",
                "type": "file",
                "size": 19073,
                "mtime": "2026-04-04T21:30:05.125Z"
              },
              {
                "name": "spec.md",
                "path": "specs/001-campus-replatform/spec.md",
                "type": "file",
                "size": 6951,
                "mtime": "2026-04-05T18:24:12.498Z"
              },
              {
                "name": "tasks.md",
                "path": "specs/001-campus-replatform/tasks.md",
                "type": "file",
                "size": 2155,
                "mtime": "2026-04-05T18:22:00.358Z"
              }
            ]
          }
        ]
      },
      {
        "name": ".specify",
        "path": ".specify",
        "type": "dir",
        "children": [
          {
            "name": "active-feature",
            "path": ".specify/active-feature",
            "type": "file",
            "size": 18,
            "mtime": "2026-04-04T21:12:38.029Z"
          },
          {
            "name": "assertion-hashes.json",
            "path": ".specify/assertion-hashes.json",
            "type": "file",
            "size": 691,
            "mtime": "2026-04-05T16:59:25.846Z"
          },
          {
            "name": "backlog.html",
            "path": ".specify/backlog.html",
            "type": "file",
            "size": 31334,
            "mtime": "2026-04-04T20:38:10.704Z"
          },
          {
            "name": "context.json",
            "path": ".specify/context.json",
            "type": "file",
            "size": 414,
            "mtime": "2026-04-05T19:40:22.384Z"
          },
          {
            "name": "dashboard-v2.html",
            "path": ".specify/dashboard-v2.html",
            "type": "file",
            "size": 241750,
            "mtime": "2026-04-05T18:25:31.363Z"
          },
          {
            "name": "dashboard.html",
            "path": ".specify/dashboard.html",
            "type": "file",
            "size": 241948,
            "mtime": "2026-04-05T19:40:30.546Z"
          },
          {
            "name": "docs",
            "path": ".specify/docs",
            "type": "dir",
            "children": [
              {
                "name": "artifacts.html",
                "path": ".specify/docs/artifacts.html",
                "type": "file",
                "size": 29462,
                "mtime": "2026-04-04T20:38:10.679Z"
              },
              {
                "name": "index.html",
                "path": ".specify/docs/index.html",
                "type": "file",
                "size": 22155,
                "mtime": "2026-04-04T20:38:10.680Z"
              },
              {
                "name": "prompts.html",
                "path": ".specify/docs/prompts.html",
                "type": "file",
                "size": 25229,
                "mtime": "2026-04-04T20:38:10.681Z"
              },
              {
                "name": "quickstart.html",
                "path": ".specify/docs/quickstart.html",
                "type": "file",
                "size": 28471,
                "mtime": "2026-04-04T20:38:10.682Z"
              },
              {
                "name": "shared",
                "path": ".specify/docs/shared",
                "type": "dir",
                "children": [
                  {
                    "name": "footer.js",
                    "path": ".specify/docs/shared/footer.js",
                    "type": "file",
                    "size": 1175,
                    "mtime": "2026-04-04T20:38:10.682Z"
                  },
                  {
                    "name": "nav.js",
                    "path": ".specify/docs/shared/nav.js",
                    "type": "file",
                    "size": 2791,
                    "mtime": "2026-04-04T20:38:10.682Z"
                  },
                  {
                    "name": "tokens.css",
                    "path": ".specify/docs/shared/tokens.css",
                    "type": "file",
                    "size": 5131,
                    "mtime": "2026-04-04T20:38:10.683Z"
                  }
                ]
              },
              {
                "name": "workspace.html",
                "path": ".specify/docs/workspace.html",
                "type": "file",
                "size": 28350,
                "mtime": "2026-04-04T20:38:10.683Z"
              }
            ]
          },
          {
            "name": "docs.html",
            "path": ".specify/docs.html",
            "type": "file",
            "size": 13214,
            "mtime": "2026-04-04T20:38:10.705Z"
          },
          {
            "name": "gate-results.json",
            "path": ".specify/gate-results.json",
            "type": "file",
            "size": 202,
            "mtime": "2026-04-05T16:53:26.650Z"
          },
          {
            "name": "governance.html",
            "path": ".specify/governance.html",
            "type": "file",
            "size": 37452,
            "mtime": "2026-04-04T20:38:10.706Z"
          },
          {
            "name": "index.html",
            "path": ".specify/index.html",
            "type": "file",
            "size": 18883,
            "mtime": "2026-04-04T20:38:10.706Z"
          },
          {
            "name": "intelligence.html",
            "path": ".specify/intelligence.html",
            "type": "file",
            "size": 24399,
            "mtime": "2026-04-04T20:38:10.706Z"
          },
          {
            "name": "knowledge-graph.json",
            "path": ".specify/knowledge-graph.json",
            "type": "file",
            "size": 8429,
            "mtime": "2026-04-05T19:51:46.236Z"
          },
          {
            "name": "landing.html",
            "path": ".specify/landing.html",
            "type": "file",
            "size": 22672,
            "mtime": "2026-04-04T20:38:10.688Z"
          },
          {
            "name": "logs.html",
            "path": ".specify/logs.html",
            "type": "file",
            "size": 37598,
            "mtime": "2026-04-04T20:38:10.707Z"
          },
          {
            "name": "pipeline.html",
            "path": ".specify/pipeline.html",
            "type": "file",
            "size": 18246,
            "mtime": "2026-04-04T20:38:10.707Z"
          },
          {
            "name": "qa-plan.json",
            "path": ".specify/qa-plan.json",
            "type": "file",
            "size": 2022,
            "mtime": "2026-04-05T19:51:46.191Z"
          },
          {
            "name": "quality.html",
            "path": ".specify/quality.html",
            "type": "file",
            "size": 37266,
            "mtime": "2026-04-04T20:38:10.707Z"
          },
          {
            "name": "search.html",
            "path": ".specify/search.html",
            "type": "file",
            "size": 26171,
            "mtime": "2026-04-04T20:38:10.708Z"
          },
          {
            "name": "shared",
            "path": ".specify/shared",
            "type": "dir",
            "children": [
              {
                "name": "data.js",
                "path": ".specify/shared/data.js",
                "type": "file",
                "size": 23771,
                "mtime": "2026-04-05T19:40:30.292Z"
              },
              {
                "name": "favicon.svg",
                "path": ".specify/shared/favicon.svg",
                "type": "file",
                "size": 965,
                "mtime": "2026-04-04T20:38:10.708Z"
              },
              {
                "name": "filter.js",
                "path": ".specify/shared/filter.js",
                "type": "file",
                "size": 3352,
                "mtime": "2026-04-04T20:38:10.709Z"
              },
              {
                "name": "footer.js",
                "path": ".specify/shared/footer.js",
                "type": "file",
                "size": 884,
                "mtime": "2026-04-04T20:38:10.709Z"
              },
              {
                "name": "i18n.js",
                "path": ".specify/shared/i18n.js",
                "type": "file",
                "size": 7205,
                "mtime": "2026-04-04T20:38:10.709Z"
              },
              {
                "name": "nav.js",
                "path": ".specify/shared/nav.js",
                "type": "file",
                "size": 27673,
                "mtime": "2026-04-04T20:38:10.709Z"
              },
              {
                "name": "search.js",
                "path": ".specify/shared/search.js",
                "type": "file",
                "size": 2600,
                "mtime": "2026-04-04T20:38:10.710Z"
              },
              {
                "name": "tokens.css",
                "path": ".specify/shared/tokens.css",
                "type": "file",
                "size": 7848,
                "mtime": "2026-04-04T20:38:10.710Z"
              }
            ]
          },
          {
            "name": "specs.html",
            "path": ".specify/specs.html",
            "type": "file",
            "size": 34426,
            "mtime": "2026-04-04T20:38:10.710Z"
          },
          {
            "name": "tour.html",
            "path": ".specify/tour.html",
            "type": "file",
            "size": 22510,
            "mtime": "2026-04-04T20:38:10.720Z"
          },
          {
            "name": "workspace.html",
            "path": ".specify/workspace.html",
            "type": "file",
            "size": 40725,
            "mtime": "2026-04-04T20:38:10.711Z"
          }
        ]
      },
      {
        "name": "workspace",
        "path": "workspace",
        "type": "dir",
        "children": []
      },
      {
        "name": "CONSTITUTION.md",
        "path": "CONSTITUTION.md",
        "type": "file",
        "size": 8992,
        "mtime": "2026-04-04T21:22:12.607Z"
      },
      {
        "name": "PREMISE.md",
        "path": "PREMISE.md",
        "type": "file",
        "size": 4359,
        "mtime": "2026-04-04T21:22:54.634Z"
      },
      {
        "name": "tasklog.md",
        "path": "tasklog.md",
        "type": "file",
        "size": 1405,
        "mtime": "2026-04-04T21:41:49.162Z"
      },
      {
        "name": "changelog.md",
        "path": "changelog.md",
        "type": "file",
        "size": 2420,
        "mtime": "2026-04-05T17:10:42.661Z"
      },
      {
        "name": "decision-log.md",
        "path": "decision-log.md",
        "type": "file",
        "size": 1627,
        "mtime": "2026-04-04T21:23:26.252Z"
      }
    ],
    "ragMemories": [],
    "sessions": [],
    "activeSession": null,
    "fileCount": 56
  },
  "knowledgeGraph": {
    "nodes": 22,
    "edges": 0,
    "orphans": {
      "untested_requirements": [],
      "untraced_principles": [],
      "unlinked_tasks": [
        "T-auto-001-campus-replatform-1",
        "T-auto-001-campus-replatform-2",
        "T-auto-001-campus-replatform-3",
        "T-auto-001-campus-replatform-4",
        "T-auto-001-campus-replatform-5",
        "T-auto-001-campus-replatform-6",
        "T-auto-001-campus-replatform-7",
        "T-auto-001-campus-replatform-8",
        "T-auto-001-campus-replatform-9",
        "T-auto-001-campus-replatform-10",
        "T-auto-001-campus-replatform-11",
        "T-auto-001-campus-replatform-12",
        "T-auto-001-campus-replatform-13",
        "T-auto-001-campus-replatform-14",
        "T-auto-001-campus-replatform-15",
        "T-auto-001-campus-replatform-16",
        "T-auto-001-campus-replatform-17",
        "T-auto-001-campus-replatform-18",
        "T-auto-001-campus-replatform-19",
        "T-auto-001-campus-replatform-20",
        "T-auto-001-campus-replatform-21",
        "T-auto-001-campus-replatform-22"
      ],
      "unimplemented_requirements": [],
      "broken_refs": [],
      "tasks_with_broken_fr": [],
      "tests_with_broken_fr": []
    },
    "stats": {
      "nodes": 22,
      "edges": 0,
      "coverage": 0,
      "principlesCovered": 0,
      "principlesTotal": 0,
      "requirementsTested": 0,
      "requirementsTotal": 0,
      "features": 1
    }
  },
  "gateHistory": [
    {
      "gate": "G1",
      "phase": "03",
      "result": "PASS",
      "timestamp": "2026-04-05T16:53:26Z",
      "findings": [],
      "errors": 0,
      "warnings": 0
    }
  ],
  "assertionStatus": {
    "count": 4,
    "generated": "2026-04-05T16:59:25Z",
    "algorithm": "sha256"
  },
  "pipelineState": {
    "currentPhase": "07",
    "completedPhases": [
      "00",
      "01",
      "02",
      "03",
      "04",
      "05",
      "06"
    ],
    "lastGateResult": null,
    "lastCompleted": "2026-04-05T17:02:30.576248Z"
  },
  "backlog": [],
  "qaplan": {
    "version": "1.0",
    "generatedAt": "2026-04-05T19:51:46.186Z",
    "constitutionVersion": "2",
    "metrics": {
      "totalFeatures": 1,
      "acCoverage": 0,
      "testCoverage": 0,
      "avgChecklistCompletion": 100,
      "totalFR": 24,
      "coveredFR": 0
    },
    "qualityGates": {
      "definitions": {
        "G1": "passed |",
        "G2": "passed |",
        "G3": "passed |"
      },
      "status": {
        "G1": {
          "applicable": 1,
          "passing": 1,
          "pass": true,
          "failing": []
        },
        "G2": {
          "applicable": 0,
          "passing": 0,
          "pass": true,
          "failing": []
        },
        "G3": {
          "applicable": 0,
          "passing": 0,
          "pass": true,
          "failing": []
        }
      }
    },
    "dodPerPhase": {
      "phase_0": {
        "total": 1,
        "description": "—"
      },
      "phase_1": {
        "total": 1,
        "description": "—"
      },
      "phase_2": {
        "total": 1,
        "description": "—"
      },
      "phase_3": {
        "total": 1,
        "description": "—"
      },
      "phase_4": {
        "total": 1,
        "description": "—"
      },
      "phase_5": {
        "total": 1,
        "description": "—"
      },
      "phase_6": {
        "total": 1,
        "description": "—"
      },
      "phase_7": {
        "total": 0,
        "description": "—"
      },
      "phase_8": {
        "total": 0,
        "description": "—"
      }
    },
    "evidenceTagRules": [
      "[CONFIG]",
      "[DOC]"
    ],
    "features": [
      {
        "name": "001-campus-replatform",
        "phase": 6,
        "hasSpec": true,
        "hasPlan": true,
        "hasAnalysis": true,
        "hasAcceptanceCriteria": false,
        "hasTestCoverage": false,
        "hasChecklist": true,
        "healthScore": null,
        "counts": {
          "fr": 24,
          "sc": 28,
          "us": 0
        },
        "ac": {
          "checked": 0,
          "total": 0
        },
        "testCoverage": {
          "covered": 0,
          "total": 24
        },
        "checklist": {
          "checked": 7,
          "total": 7
        }
      }
    ]
  },
  "changelog": [
    {
      "date": "2026-04-04",
      "type": "decision",
      "description": "Constitución ampliada de 8 a 12 principios tras Debate Socrático — agregados IX (Knowledge Graph), X (Logs), XI (DoD), XII (Evidence Tags) [DEC-001] [Principles I-XII]"
    }
  ],
  "tasklog": [
    {
      "id": "TL-001",
      "task": "Validar P-06: Export de contenido MasterStudy",
      "status": "open",
      "owner": "Frente 4: ETL",
      "opened": "2026-04-04"
    },
    {
      "id": "TL-002",
      "task": "Validar P-07: Deploy SPA en subcarpeta Hostinger",
      "status": "open",
      "owner": "Frente 2: Frontend",
      "opened": "2026-04-04"
    },
    {
      "id": "TL-003",
      "task": "Validar P-09: Target 1000 concurrentes",
      "status": "open",
      "owner": "Stakeholder",
      "opened": "2026-04-04"
    },
    {
      "id": "TL-004",
      "task": "Validar P-10: Migración de usuarios WP → Supabase",
      "status": "open",
      "owner": "Frente 4: ETL",
      "opened": "2026-04-04"
    },
    {
      "id": "TL-005",
      "task": "Validar P-11: Stripe como gateway de pagos",
      "status": "open",
      "owner": "Stakeholder",
      "opened": "2026-04-04"
    },
    {
      "id": "TL-006",
      "task": "Ejecutar Phase 7 (/sdd:07-implement)",
      "status": "open",
      "owner": "Pipeline",
      "opened": "2026-04-04"
    },
    {
      "id": "TL-007",
      "task": "Alimentar NotebookLM con artefactos del proyecto",
      "status": "open",
      "owner": "Knowledge Mgmt",
      "opened": "2026-04-04"
    }
  ],
  "decisionLog": [
    {
      "id": "DEC-001",
      "title": "Constitución ampliada a 12 principios",
      "status": "proposed",
      "context": "",
      "decision": ""
    },
    {
      "id": "DEC-002",
      "title": "5 premisas pendientes de validación — threshold 29.4%",
      "status": "proposed",
      "context": "",
      "decision": ""
    }
  ],
  "sentinel": {},
  "sessionLog": [],
  "smartNav": {
    "message": "1 feature(s) in progress",
    "command": "/sdd:status",
    "action": "Check pipeline status"
  },
  "summary": {
    "totalFeatures": 1,
    "completeFeatures": 0,
    "totalTasks": 22,
    "completedTasks": 18
  }
};
