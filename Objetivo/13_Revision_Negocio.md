⚠️ **DOCUMENTO INTERNO — NO COMPARTIR CON CLIENTE/EXTERNOS** ⚠️

# Campus MetodologIA — Revisión de Negocio (Interno)

> Audiencia: equipo fundador MetodologIA · Javier + círculo cercano · Abril 2026
> **Prohibido distribuir fuera del círculo interno. Borrar de archivos compartidos con clientes.**

---

## TL;DR interno

1. **Modelo base:** 70/30 (MetodologIA/docente invitado) con tiers negociables por tracción.
2. **B2B2C recomendado**: licencia por seat para empresas medianas; licencia por campus (flat) para enterprise.
3. **Pricing estructural en 3 tiers** (Free/Pro/Enterprise) — sin números monetarios aquí.
4. **Lock-out competitivo** vía IP "100 Check" + credenciales OpenBadges firmadas.
5. **Sofka como canal B2B potencial** — cuidado con brand separation.
6. **Riesgos comerciales dominantes:** saturación bootcamp LatAm + CAC de incumbentes.
7. **Open decisions** para Javier listadas al cierre.

---

## 1. Modelo de revenue share con docentes invitados

### 1.1 Split default

| Variable | Default MetodologIA | Rango negociable |
|---|---|---|
| % MetodologIA sobre ingreso neto | 30% | 20–40% |
| % Docente | 70% | 60–80% |
| Base de cálculo | Ingreso neto (después de pasarela de pago + impuestos) | — |
| Reserva técnica (hosting, signing, soporte) | Cubierta por el 30% plataforma | — |
| Ventana de liquidación | Mensual, T+15 | — |
| Mínimo liquidable | Umbral chico (evita microtransfers) | — |

### 1.2 Tabla ejemplo (magnitudes relativas, sin números absolutos)

| Tier docente | Criterio | Split MetodologIA / Docente | Racional |
|---|---|---|---|
| **Starter** | Primer curso publicado | 30 / 70 | Onboarding estándar |
| **Established** | 3+ cursos activos con NPS > 40 | 25 / 75 | Fidelización |
| **Hero** | Docente con branding propio traído a MetodologIA | 20 / 80 | Adquisición + co-marketing |
| **White-label autor** | Docente vende a su propia lista, MetodologIA solo hosting+signing | 10 / 90 | Prestación infra pura |

### 1.3 Clauses clave en el contrato docente

- **Propiedad intelectual:** docente retiene IP del contenido; MetodologIA licencia no-exclusiva para distribuir en el campus durante vigencia + 12m cola.
- **Moderación editorial:** MetodologIA puede rechazar contenido por calidad, brand-fit o política (DUA mínimos, bloom coverage, accesibilidad AA).
- **Cláusula 100 Check:** docente acepta que su contenido sea auditado con rubric MetodologIA y debe corregir findings clase 🔴.
- **No-compete temporal:** durante vigencia del curso activo, docente no puede publicar MISMO curso (mismo material) en plataforma competidora LatAm específica (ver lista en contrato). `[SUPUESTO]` — validar con legal.
- **Exit ramp:** al terminar vigencia, docente recibe export xAPI + contenido en OER-friendly.

---

## 2. Modelo B2B2C para corporativos

### 2.1 Dos arquetipos de cliente B2B

| Arquetipo | Perfil | Modelo recomendado | Features mínimas |
|---|---|---|---|
| **Mediana (50–500 colaboradores)** | "Sofía Corp" — fintech, startup LatAm | **Licencia por seat activo** | SSO OIDC, reportería cohorte, catálogo seleccionado, branding mínimo (logo + color accent) |
| **Enterprise (500+)** | Corporación tradicional, integración HRIS, compliance | **Licencia por campus (flat anual)** | SSO SAML, OneRoster sync, white-label completo, DPA firmado, soporte dedicado, SLAs |

### 2.2 Definiciones operativas

- **Seat activo** = usuario con al menos 1 login en mes natural (no por contrato inactivo).
- **Campus** = tenant dedicado con dominio propio (sub-dominio cliente.campus.metodologia.info o custom).
- **Onboarding corporate target:** ≤ 2 semanas end-to-end (kickoff → catálogo seleccionado → SSO configurado → primera cohorte matriculada).

### 2.3 Features lock por tier (estructura, sin precios)

| Feature | Free (trial) | Pro (mediana) | Enterprise |
|---|---|---|---|
| Catálogo abierto | ✅ | ✅ | ✅ |
| Autor invitado publica | ✅ | ✅ | ✅ |
| SSO Google / magic link | ✅ | ✅ | ✅ |
| SSO OIDC custom | ❌ | ✅ | ✅ |
| SSO SAML 2.0 | ❌ | ❌ | ✅ |
| Branding (logo + colores) | ❌ | ✅ | ✅ |
| White-label completo (dominio + templates) | ❌ | ❌ | ✅ |
| OpenBadges firmados por el cliente | ❌ | ✅ (co-brand) | ✅ (brand cliente o MetodologIA) |
| LTI 1.3 Provider (integrar en LMS cliente) | ❌ | ❌ (M2 gate) | ✅ |
| OneRoster 1.2 sync | ❌ | ❌ | ✅ |
| Reportería avanzada (drill-down, XLSX export) | básica | intermedia | avanzada + API |
| DPA firmado + SOC 2 shared responsibility | ❌ | addendum | incluido |
| Soporte | comunidad | email 48h | prioritario + success manager |
| SLA uptime | best-effort | 99.5% | 99.9% con créditos |
| Retention xAPI | 3 meses | 12 meses | 24 meses configurable |

---

## 3. Pricing structural

### 3.1 Principios

- **Anchor en ROI del cliente**, no en hours-of-content (evitar commoditización tipo Udemy).
- **Bundles por competencia**, no por curso individual (consistente con 100 Check).
- **Predictable billing** anual con opción mensual +15-20% premium (industry std).
- **Transparencia radical** en revenue share con docentes — publicar la política, no solo en contrato.

### 3.2 Tiers en 3 capas (sin cifras)

- **Free / Community**: catálogo limitado, sin credenciales firmadas, ads MetodologIA, evento de conversión a Pro.
- **Pro (B2C aprendiz)**: acceso a catálogo curado, badges firmados, certificados verificables, tutor IA (cuando exista M5).
- **Enterprise (B2B)**: campus white-label, SSO SAML, integraciones, reportería, DPA.

**Guardrail:** los números monetarios se definen en Notion interno `Pricing Matrix v1`, no en este documento que podría filtrarse.

---

## 4. Estrategias de lock-out competitivo

| Estrategia | Mecanismo | Defensibilidad |
|---|---|---|
| **IP "100 Check Standard"** | Marca registrada + método documentado + auditoría pública del framework | Alta: marca + método se vuelve referencia en edtech LatAm |
| **OpenBadges 3.0 firmados por MetodologIA** | Credenciales verificables con raíz de confianza MetodologIA; los learners acumulan historial aquí | Media-Alta: switch cost aumenta con cada badge |
| **Red agéntica MetodologIA** (SDF/MAO/JM) | Workflow de producción de contenido acelerado — un autor produce 3× más rápido aquí que en otra plataforma | Alta: asimetría de operación difícil de replicar |
| **Mercado autores latam** | Pool de docentes estrella con contratos de exclusividad parcial | Media: depende de términos |
| **Data moat pedagógico** | xAPI histórico + mastery states → recomendador personalizado mejora con escala | Media: requiere escala para activarse |
| **Integraciones B2B (LTI/OneRoster)** | Una vez integrado un corporate, el switching cost es alto | Alta: estándar B2B clásico |
| **Comunidad + brand aspiracional** | "MetodologIA alumni" como credencial simbólica en LinkedIn | Media: construcción lenta |

---

## 5. Opciones de partnership

### 5.1 Sofka Technologies como canal B2B

Javier tiene rol dual (Sofka PreSales + MetodologIA founder). Oportunidad:
- **Sofka vende** transformación digital a corporates LatAm → adjunta Campus MetodologIA como componente de capacitación del programa.
- **Revenue**: referral fee a Sofka por cada contrato enterprise firmado con su aval.
- **Branding**: campus mantiene marca MetodologIA (nunca Sofka); Sofka aparece como "partner tecnológico recomendado".

⚠️ **Brand separation crítica:** este documento es MetodologIA interno. Cualquier material conjunto se produce con el plugin SDF (marca Sofka) o MAO (abierto), nunca mezclando. Ver hard-rule del CLAUDE global `/Users/deonto/.claude/CLAUDE.md`.

### 5.2 Otras partnerships posibles

| Partner | Tipo | Racional | Riesgo |
|---|---|---|---|
| Universidades LatAm | Co-creación de programas ejecutivos | Acceso a segmento educación continua | Brand dilution si sin curación |
| Cámaras de comercio / gremios | Capacitación sectorial | Volumen inmediato B2B | Lowball pricing |
| LinkedIn Learning / Coursera | Redistribución de cursos seleccionados | Reach global | Competencia interna por el learner |
| Gobierno / Sena (Colombia) | Programas públicos | Escala + legitimidad | Dependencia política, ciclos lentos |

---

## 6. Riesgos comerciales

| # | Riesgo | Severidad | Probabilidad | Mitigación |
|---|---|---|---|---|
| R-01 | Saturación del mercado bootcamp/edtech LatAm | 🔴 | Alta | Posicionamiento premium + método IP + quality gate (no volume-play) |
| R-02 | CAC bajo de incumbentes (Platzi ~USD 10-20 estimado `[SUPUESTO]`) | 🔴 | Alta | Orgánico (LinkedIn Javier personal brand) + B2B (ventas consultivas, no self-serve) |
| R-03 | Compression de precios B2C por AI tutors gratuitos (ChatGPT free) | 🟡 | Media | Valor humano + cohort + certificación verificable + accountability |
| R-04 | Regulación educativa (MEN Colombia, SEP México) cambia requisitos credenciales | 🟡 | Baja-Media | Monitoreo regulatorio trimestral; OpenBadges ya cumple W3C VC |
| R-05 | Dependencia de 1-2 docentes estrella (key-person risk) | 🟡 | Media | Diversificación catálogo + contratos no-compete + substitución gradual |
| R-06 | Churn B2B por switching a LMS interno del cliente | 🟡 | Media | Integraciones profundas (LTI Provider M2+) + DPA + success manager |
| R-07 | Disputa IP con docente | 🟢 | Baja | Contrato claro + arbitraje + licencia no-exclusiva documentada |
| R-08 | Data breach / GDPR fine | 🟡 | Baja | Privacy-by-design + seguro cyber (B2B tier) |

---

## 7. KPIs de negocio

| KPI | Definición | Target cualitativo M1-M3 `[INFERENCIA]` |
|---|---|---|
| **CAC (B2C)** | Costo adquisición por learner Pro | Muy bajo vía orgánico; escalable via paid si NPS > 45 |
| **CAC (B2B)** | Costo adquisición por contrato enterprise | Alto (ventas consultivas) pero ROI > 3× en año 1 |
| **LTV (B2C)** | Revenue acumulado por learner en vida | Maximizar con tracks encadenadas y renovación anual |
| **Churn mensual (B2C Pro)** | % cancelaciones mes/mes | < 6% (benchmark edtech LatAm 8-12%) `[SUPUESTO]` |
| **Churn anual (B2B)** | % cuentas no-renovadas | < 15% |
| **NPS** | Net Promoter Score in-product | ≥ 45 |
| **Activation rate** | Ver doc 12 | ≥ 70% B2C / ≥ 80% B2B |
| **Revenue mix B2B/B2C** | Distribución ingresos | Target 60/40 B2B/B2C en año 1 (cash stability) |
| **Gross margin** | (Ingreso − COGS directo) / Ingreso | > 70% (SaaS-like) |
| **Rule of 40** | Crecimiento % + margen % | Monitoreo desde año 2 |

---

## 8. Canales de adquisición

### 8.1 Orgánico (dominante año 1)

- **LinkedIn Javier Montaño** — thought leadership + "behind the scenes" de MetodologIA. Frecuencia alta.
- **YouTube MetodologIA** — piezas del método "100 Check" aplicado a casos reales.
- **Newsletter** (Substack o propia) — corte quincenal, casos + lecciones.
- **SEO** — landings por competencia + guías largas; domain authority vía backlinks de cases.

### 8.2 Paid (activar en M2/M3 cuando funnel esté medido)

- Google Ads (branded + competencia).
- LinkedIn Ads (B2B targeting L&D managers).
- Meta Ads (B2C lookalike sobre Pro actuales).
- **Nunca paid** hasta que la métrica **CAC < LTV/3** esté validada.

### 8.3 Partnerships (M2+)

- Sofka + otras consultoras (referral).
- Comunidades de práctica (devs, datos, producto).

### 8.4 Comunidad

- Discord / Slack de alumni (post-programa).
- Eventos presenciales esporádicos (premium touch).
- Advocacy loop: alumni → recomienda → descuento referral.

---

## 9. Open decisions (requieren input de Javier)

1. **Scope definitivo B2B vs B2C**. El plan apuesta B2B2C (60/40 rev mix target). Confirmar o cambiar.
2. **Split default revenue docentes**. 70/30 es el draft. ¿Negociar tier Hero en 80/20 desde el inicio?
3. **Branding corporativo opcional en tier Enterprise**: ¿permitir "Powered by MetodologIA" retirable bajo coste adicional?
4. **Partnership con Sofka formal**: ¿referral contract escrito o informal hasta primer cliente?
5. **Precios absolutos** (fuera de este doc por seguridad) — programar sesión de pricing con benchmark tool.
6. **Política de reembolso B2C** (7d / 14d / 30d / no).
7. **Política IA**: ¿features IA son upsell Pro o core Free? Decisión afecta CAC y diferenciación.
8. **Jurisdicción contratos**: ¿Colombia + arbitraje Cámara de Comercio Bogotá, o Delaware USA para contratos enterprise?
9. **Moneda de contrato B2B LatAm**: USD, MXN, COP, local — impacto FX.
10. **Seguro cyber y E&O** — cuando superemos cierto tamaño B2B es mandatorio.

---

## 10. Escenarios cualitativos `[SUPUESTO]`

### Escenario A — "B2B dominante"
- Primer cliente corporate mediano firma en M2.
- Revenue mix 80/20 B2B/B2C en año 1.
- Menor CAC pero mayor concentración; riesgo key-account.

### Escenario B — "B2C aspiracional"
- LinkedIn de Javier genera tracción; 300-500 Pro en año 1.
- Revenue mix 20/80 B2B/B2C.
- CAC mayor pero defensible; data moat pedagógico crece.

### Escenario C — "Balanceado" (target)
- 1-2 clientes B2B + 100-200 Pro.
- Revenue 60/40 B2B/B2C.
- Cash stable, optionality para pivotes.

---

## Disclaimer interno

> Documento interno del equipo MetodologIA. No constituye oferta comercial ni proyección financiera vinculante. Las estimaciones cualitativas se basan en benchmarks edtech LatAm 2025-2026 `[INFERENCIA]` `[SUPUESTO]`. Cualquier uso externo requiere sanitización previa y aprobación escrita del founder.

---

⚠️ **DOCUMENTO INTERNO — NO COMPARTIR CON CLIENTE/EXTERNOS** ⚠️

---

*MetodologIA — Success as a Service · Construido con método, potenciado por la red agéntica.*
