## DEC-001: Constitución ampliada a 12 principios
- **Date**: 2026-04-04
- **Context**: Gap analysis del Debate Socrático 1 contra framework SDD reveló 5 requisitos no cubiertos (Evidence Tags, DoD, Logs, Session Protocol, Knowledge Graph)
- **Options**: (A) Mantener 8 principios y referenciar SDD externamente (B) Ampliar a 12 principios auto-contenidos
- **Decision**: Opción B — Agregar Principios IX (Knowledge Graph), X (Logs), XI (DoD), XII (Evidence Tags)
- **Rationale**: Principios I-VIII cubren el producto; IX-XII cubren el proceso SDD. Un agente AI nuevo que solo lea CONSTITUTION.md tiene contexto completo [Principio IX - Generación Recursiva de Conocimiento]
- **Consequences**: La constitución es auto-suficiente para orquestación agéntica. Los agentes no necesitan leer el framework SDD para conocer las reglas del proyecto.

## DEC-002: 5 premisas pendientes de validación — threshold 29.4%
- **Date**: 2026-04-04
- **Context**: Debate Socrático 2 clasificó 17 premisas del proyecto; 5 son `[ASSUMPTION]` (29.4%)
- **Options**: (A) Bloquear pipeline hasta validar todas (B) Proceder con pipeline, crear tareas de validación para Phase 5
- **Decision**: Opción B — Proceder. 29.4% < 30% threshold del framework SDD
- **Rationale**: Las 5 assumptions son de bajo riesgo a corto plazo (P-06, P-07, P-09, P-10, P-11). Las de alto riesgo (P-06, P-10) se resuelven en Frente 4 (ETL) que no bloquea los frentes 1-3 [Principio VII - Atomicidad Multi-Agente]
- **Consequences**: Se pueden iniciar los frentes 1-3 inmediatamente. El Frente 4 (ETL) necesita validar P-06 y P-10 antes de implementar.
