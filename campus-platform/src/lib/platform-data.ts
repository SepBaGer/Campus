import type {
  BadgeSnapshot,
  BlockSnapshot,
  CompetencySnapshot,
  CourseSnapshot,
  LeaderboardEntrySnapshot,
  NotificationCenterSnapshot,
  NotificationDispatchSnapshot,
  NotificationTemplateSnapshot,
  MasterySnapshot,
  PortalSnapshot,
  PortalGamificationSnapshot,
  SessionSnapshot
} from "./platform-types";
import { getBlockExperienceProfile, getBloomLabel } from "./block-profile";
import { resolveCommunitySnapshot } from "./community-config";

const demoSessions: SessionSnapshot[] = [
  {
    id: 11,
    title: "Run open - Brujula operativa",
    startsAt: "2026-05-06T19:00:00.000Z",
    endsAt: "2026-05-06T20:30:00.000Z",
    modality: "live-online",
    locationLabel: "Meet + iCal"
  },
  {
    id: 12,
    title: "Clinic - Deep Research aplicado",
    startsAt: "2026-05-10T19:00:00.000Z",
    endsAt: "2026-05-10T20:30:00.000Z",
    modality: "live-online",
    locationLabel: "Meet + replays"
  },
  {
    id: 13,
    title: "Office hours - Cierre de sprint",
    startsAt: "2026-05-13T19:00:00.000Z",
    endsAt: "2026-05-13T20:00:00.000Z",
    modality: "live-online",
    locationLabel: "Canal privado"
  }
];

const demoBlockSeed = [
  {
    id: 101,
    slug: "m1-s1-de-ocupado-a-productivo",
    title: "M1 - S1 - De Ocupado a Productivo",
    summary: "2 versiones: Metodo o IA para instalar foco, calendario y criterio operativo.",
    objective: "Salir del automatismo y abrir la ruta con una mejora visible desde la primera semana.",
    kind: "video",
    durationMinutes: 18,
    isFree: true
  },
  {
    id: 201,
    slug: "s2-operativa-bienvenida-y-nivelacion",
    title: "S2 - Operativa - Bienvenida y Nivelacion",
    summary: "Semana operativa para configurar entorno, brujula y primeros aceleradores.",
    objective: "Dejar listo el sistema base antes de entrar a los modulos troncales.",
    kind: "interactive",
    durationMinutes: 20,
    isFree: false
  },
  {
    id: 301,
    slug: "m2-s3-del-automatismo-a-la-presencia",
    title: "M2 - S3 - Del Automatismo a la Presencia",
    summary: "Proposito, ROI y foco para decidir con mejor criterio.",
    objective: "Convertir intencion en una ruta medible de trabajo.",
    kind: "video",
    durationMinutes: 24,
    isFree: false
  },
  {
    id: 302,
    slug: "m3-s4-de-cumplir-a-sorprender",
    title: "M3 - S4 - De Cumplir a Sorprender",
    summary: "Pensamiento estructurado para pasar de reaccion a propuesta.",
    objective: "Disenar respuestas mas claras, utiles y transferibles.",
    kind: "video",
    durationMinutes: 28,
    isFree: false
  },
  {
    id: 303,
    slug: "m4-s5-de-trabajar-duro-a-sin-friccion",
    title: "M4 - S5 - De Trabajar Duro a Sin Friccion",
    summary: "Deep Research aplicado para investigar, sintetizar y decidir con evidencia.",
    objective: "Reducir friccion y elevar la calidad de las decisiones.",
    kind: "interactive",
    durationMinutes: 30,
    isFree: false
  },
  {
    id: 304,
    slug: "m5-s6-de-caoticos-a-estrategicos",
    title: "M5 - S6 - De Caoticos a Estrategicos",
    summary: "Systemic Copywriting para ordenar ideas, oferta y narrativa.",
    objective: "Construir mensajes mas coherentes con el metodo y el contexto.",
    kind: "reading",
    durationMinutes: 26,
    isFree: false
  },
  {
    id: 305,
    slug: "m6-s7-de-sin-estructura-a-alto-desempeno",
    title: "M6 - S7 - De sin Estructura a Alto Desempeno",
    summary: "Data Intelligence para decidir con senales y no con intuicion aislada.",
    objective: "Elevar el nivel de lectura de datos del dia a dia.",
    kind: "video",
    durationMinutes: 27,
    isFree: false
  },
  {
    id: 306,
    slug: "m7-s8-de-efectivas-a-alto-rendimiento",
    title: "M7 - S8 - De Efectivas a Alto Rendimiento",
    summary: "Visual Engine para volver mas clara la ejecucion y los entregables.",
    objective: "Disenar artefactos que comuniquen mejor y aceleren acuerdos.",
    kind: "interactive",
    durationMinutes: 29,
    isFree: false
  },
  {
    id: 401,
    slug: "m8-s9-de-bocetos-a-prototipos-con-ia",
    title: "M8 - S9 - De Bocetos a Prototipos con IA",
    summary: "Autonomous Agents para pasar de idea a sistema operativo.",
    objective: "Transformar iniciativas en prototipos con criterios claros.",
    kind: "video",
    durationMinutes: 31,
    isFree: false
  },
  {
    id: 402,
    slug: "m9-s10-de-convencional-a-sorprendente",
    title: "M9 - S10 - De Convencional a Sorprendente",
    summary: "Stack Optimization para quitar ruido y ganar velocidad.",
    objective: "Optimizar el stack de trabajo sin perder gobernanza.",
    kind: "reading",
    durationMinutes: 23,
    isFree: false
  },
  {
    id: 403,
    slug: "m10-s11-productividad-aumentada",
    title: "M10 - S11 - Productividad Aumentada",
    summary: "No-Code Systems para multiplicar capacidad sin crecer friccion.",
    objective: "Conectar piezas operativas y reducir trabajo manual repetitivo.",
    kind: "interactive",
    durationMinutes: 25,
    isFree: false
  },
  {
    id: 404,
    slug: "m11-s12-trabajo-amplificado",
    title: "M11 - S12 - Trabajo Amplificado",
    summary: "Custom Engines para estandarizar ejecucion y feedback.",
    objective: "Construir una practica mas estable y reusable.",
    kind: "video",
    durationMinutes: 33,
    isFree: false
  },
  {
    id: 405,
    slug: "m12-s13-14-de-manual-a-automatizado",
    title: "M12 - S13-14 - De Manual a Automatizado",
    summary: "Real Solutions para convertir el metodo en solucion operativa.",
    objective: "Llevar una mejora de punta a punta hasta un caso real.",
    kind: "project",
    durationMinutes: 45,
    isFree: false
  },
  {
    id: 406,
    slug: "m13-s15-revolucion-digital",
    title: "M13 - S15 - Revolucion Digital",
    summary: "Presentacion final para consolidar narrativa, resultado y evidencia.",
    objective: "Cerrar la ruta con una solucion comunicable y verificable.",
    kind: "project",
    durationMinutes: 20,
    isFree: false
  },
  {
    id: 501,
    slug: "m14-s16-empoderamiento",
    title: "M14 - S16 - Empoderamiento",
    summary: "Cierre y embajadores para activar continuidad, red y credencial.",
    objective: "Salir con una siguiente etapa clara y un activo verificable.",
    kind: "project",
    durationMinutes: 19,
    isFree: false
  }
] as const;

const demoCompetencies: CompetencySnapshot[] = [
  {
    slug: "foco-y-autonomia-operativa",
    title: "Foco y autonomia operativa",
    bloomLevel: "aplicar",
    bloomLabel: getBloomLabel("aplicar"),
    position: 1
  },
  {
    slug: "pensamiento-estrategico-y-sistemico",
    title: "Pensamiento estrategico y sistemico",
    bloomLevel: "analizar",
    bloomLabel: getBloomLabel("analizar"),
    position: 2
  },
  {
    slug: "comunicacion-estructurada-con-evidencia",
    title: "Comunicacion estructurada con evidencia",
    bloomLevel: "evaluar",
    bloomLabel: getBloomLabel("evaluar"),
    position: 3
  },
  {
    slug: "diseno-de-soluciones-con-ia",
    title: "Diseno de soluciones con IA",
    bloomLevel: "crear",
    bloomLabel: getBloomLabel("crear"),
    position: 4
  }
];

const demoProjectRubric = {
  slug: "rubrica-proyecto-evidencia-de-impacto",
  title: "Rubrica de evidencia de impacto",
  scaleMax: 4,
  criteria: [
    {
      slug: "claridad-del-problema",
      title: "Claridad del problema",
      description: "Explica reto, contexto y resultado esperado.",
      weight: 0.25
    },
    {
      slug: "aplicacion-metodologica",
      title: "Aplicacion metodologica",
      description: "Usa el metodo trabajado en la ruta.",
      weight: 0.25
    },
    {
      slug: "evidencia-de-ejecucion",
      title: "Evidencia de ejecucion",
      description: "Presenta una prueba observable del cambio.",
      weight: 0.3
    },
    {
      slug: "reflexion-y-siguientes-pasos",
      title: "Reflexion y siguientes pasos",
      description: "Explica aprendizaje, tradeoffs y proxima iteracion.",
      weight: 0.2
    }
  ]
};

const demoBlocks: BlockSnapshot[] = demoBlockSeed.map((block, index) => {
  const profile = getBlockExperienceProfile(block.kind);
  const competencyBucket = Math.min(
    demoCompetencies.length - 1,
    Math.floor((index * demoCompetencies.length) / demoBlockSeed.length)
  );
  const competency = demoCompetencies[competencyBucket];

  return {
    id: block.id,
    slug: block.slug,
    title: block.title,
    summary: block.summary,
    objective: block.objective,
    kind: profile.kind,
    kindLabel: profile.kindLabel,
    rendererLabel: profile.rendererLabel,
    rendererManifest: profile.rendererManifest,
    representationModes: profile.representationModes,
    expressionFormats: profile.expressionFormats,
    assistiveTechHints: profile.assistiveTechHints,
    voiceDictationEnabled: profile.voiceDictationEnabled,
    engagementHooks: profile.engagementHooks,
    bloomLevel: profile.bloomLevel,
    bloomLabel: profile.bloomLabel,
    order: index + 1,
    durationMinutes: block.durationMinutes,
    isFree: block.isFree,
    competencySlug: competency.slug,
    competencyTitle: competency.title,
    rubricSlug: block.kind === "project" ? demoProjectRubric.slug : "",
    rubricTitle: block.kind === "project" ? demoProjectRubric.title : "",
    rubricScaleMax: block.kind === "project" ? demoProjectRubric.scaleMax : 0,
    rubricCriteria: block.kind === "project" ? demoProjectRubric.criteria : []
  };
});

const demoCommunity = resolveCommunitySnapshot(
  {
    id: 1,
    slug: "power-skills-pilot-open",
    title: "Cohorte mayo 2026 | abierta"
  },
  {
    enabled: true,
    provider: "discourse",
    title: "Comunidad de cohorte Power Skills",
    summary: "Foro guiado para preguntas, avances con evidencia y peer-review entre profesionales de la cohorte.",
    entry_label: "Abrir comunidad",
    discussion_prompt: "Presentate con un reto real de trabajo y comparte la evidencia que quieres producir durante esta cohorte.",
    peer_review_enabled: true,
    surface_modes: ["forum", "peer_review"],
    expectations: [
      "Publica una actualizacion semanal con contexto y una decision visible.",
      "Pide feedback con una pregunta concreta y una evidencia adjunta.",
      "Responde a dos companeros con sugerencias accionables."
    ],
    lti: {
      tool_mode: "mock",
      title: "Discourse sandbox de cohorte",
      client_id: "campus-platform-v3",
      deployment_id: "deployment-community-pilot",
      resource_link_id: "resource-community-pilot",
      launch_presentation: "window",
      custom_parameters: {
        provider: "discourse",
        surface: "community",
        channel: "power-skills-pilot"
      }
    }
  }
);

const demoCourse: CourseSnapshot = {
  slug: "programa-empoderamiento-power-skills",
  title: "Programa de Empoderamiento en Power Skills",
  summary: "Ruta principal para pasar de friccion operativa a una practica profesional con metodo, IA y evidencia reusable.",
  eyebrow: "Programa elite | 2026",
  audience: "Profesionales y equipos que necesitan pasar de teoria a ritmo operativo.",
  accessModel: "Activacion guiada + membresia premium",
  priceLabel: "Diagnostico + activacion guiada",
  deliveryLabel: "Cohorte guiada + sesiones en vivo",
  runLabel: "Cohorte mayo 2026 | abierta",
  progressPercent: 40,
  trackTitle: "Power Skills",
  transformationPromise: "Pasar de ocupacion reactiva a un sistema personal de ejecucion con criterio, evidencia, calendario y ceremonias sostenibles.",
  durationLabel: "16 semanas | 14 modulos + semana operativa + badge final",
  heroMetrics: [
    { label: "Ruta", value: "2 fases + cierre" },
    { label: "Formato", value: "Cohorte guiada con practica" },
    { label: "Competencias", value: String(demoCompetencies.length) },
    { label: "Resultado", value: "Badge verificable" }
  ],
  competencies: demoCompetencies,
  sessions: demoSessions,
  community: demoCommunity,
  blocks: demoBlocks
};

const demoBadge: BadgeSnapshot = {
  token: "demo-badge-power-skills",
  learnerName: "Sebastian Demo",
  courseTitle: demoCourse.title,
  issuedAt: "2026-05-20T18:30:00.000Z",
  issuer: "Campus MetodologIA",
  status: "issued",
  criteria: "Completo el curso piloto, participo en la clinic final y entrego una mejora operativa verificable."
};

const demoCompletedBlocks = 6;
const demoMastery: MasterySnapshot[] = demoCompetencies.map((competency) => {
  const blocksForCompetency = demoBlocks.filter((block) => block.competencySlug === competency.slug);
  const completedForCompetency = blocksForCompetency.filter((block) => block.order <= demoCompletedBlocks).length;
  const masteryLevel = Number(
    (blocksForCompetency.length
      ? completedForCompetency / blocksForCompetency.length
      : 0).toFixed(2)
  );
  const nextReviewAt = completedForCompetency > 0
    ? new Date(Date.UTC(2026, 4, 11 + competency.position, 14, 0, 0)).toISOString()
    : null;

  return {
    competencySlug: competency.slug,
    competencyTitle: competency.title,
    bloomLevel: competency.bloomLevel,
    bloomLabel: competency.bloomLabel,
    position: competency.position,
    masteryLevel,
    masteryPercent: Math.round(masteryLevel * 100),
    nextReviewAt,
    repetitions: completedForCompetency > 0 ? completedForCompetency : 0,
    intervalDays: completedForCompetency > 0 ? competency.position + 2 : 0,
    isDue: false
  };
});

const demoLeaderboard: LeaderboardEntrySnapshot[] = [
  {
    personId: "demo-person",
    learnerName: "Sebastian Demo",
    completedAttempts: demoCompletedBlocks,
    totalXp: 960,
    currentStreakDays: 4,
    longestStreakDays: 7,
    lastActivityOn: "2026-05-12",
    rankPosition: 2,
    participantCount: 4,
    isCurrentLearner: true
  },
  {
    personId: "peer-01",
    learnerName: "Valentina Pardo",
    completedAttempts: 7,
    totalXp: 1120,
    currentStreakDays: 5,
    longestStreakDays: 9,
    lastActivityOn: "2026-05-12",
    rankPosition: 1,
    participantCount: 4,
    isCurrentLearner: false
  },
  {
    personId: "peer-02",
    learnerName: "Manuela Rios",
    completedAttempts: 5,
    totalXp: 840,
    currentStreakDays: 3,
    longestStreakDays: 4,
    lastActivityOn: "2026-05-11",
    rankPosition: 3,
    participantCount: 4,
    isCurrentLearner: false
  },
  {
    personId: "peer-03",
    learnerName: "Camilo Vega",
    completedAttempts: 4,
    totalXp: 720,
    currentStreakDays: 2,
    longestStreakDays: 3,
    lastActivityOn: "2026-05-10",
    rankPosition: 4,
    participantCount: 4,
    isCurrentLearner: false
  }
];

const demoGamification: PortalGamificationSnapshot = {
  completedAttempts: demoCompletedBlocks,
  totalXp: 960,
  currentStreakDays: 4,
  longestStreakDays: 7,
  lastActivityOn: "2026-05-12",
  leaderboardOptIn: true,
  rankPosition: 2,
  participantCount: demoLeaderboard[0]?.participantCount || 0,
  refreshedAt: "2026-05-12T18:00:00.000Z"
};

const demoPortal: PortalSnapshot = {
  learnerName: "Sebastian Demo",
  membershipLabel: "Miembro activo de cohorte premium",
  enrolledCourseTitle: demoCourse.title,
  activeRunLabel: demoCourse.runLabel,
  completedBlocks: demoCompletedBlocks,
  totalBlocks: demoBlocks.length,
  progressPercent: 40,
  nextReviewAt: demoMastery.find((entry) => entry.nextReviewAt)?.nextReviewAt || "2026-05-11T14:00:00.000Z",
  dueReviewsCount: 0,
  atRiskLabel: "Ritmo saludable",
  gamification: demoGamification,
  leaderboard: demoLeaderboard,
  mastery: demoMastery
};

const demoNotificationTemplates: NotificationTemplateSnapshot[] = [
  {
    id: 1,
    runId: 1,
    runSlug: "power-skills-pilot-open",
    runTitle: demoCourse.runLabel,
    slug: "bienvenida-cohorte-email",
    title: "Bienvenida de cohorte",
    channelCode: "email",
    audienceCode: "active",
    triggerCode: "manual",
    offsetDays: 0,
    offsetHours: 0,
    subjectTemplate: "Tu cohorte {{run_title}} ya esta activa, {{learner_name}}",
    bodyTemplate: "Hola {{learner_name}}, ya puedes abrir el portal y revisar la primera experiencia de {{course_title}}.",
    ctaLabel: "Abrir portal",
    ctaUrl: "/portal",
    status: "active"
  },
  {
    id: 2,
    runId: 1,
    runSlug: "power-skills-pilot-open",
    runTitle: demoCourse.runLabel,
    slug: "alerta-sesion-web",
    title: "Alerta web de sesion",
    channelCode: "web",
    audienceCode: "active",
    triggerCode: "before_run_start",
    offsetDays: 0,
    offsetHours: -2,
    subjectTemplate: "Sesion en puerta: {{next_session_title}}",
    bodyTemplate: "{{learner_name}}, en dos horas inicia la siguiente sesion de la cohorte.",
    ctaLabel: "Ver agenda",
    ctaUrl: "/portal",
    status: "active"
  }
];

const demoNotificationDispatches: NotificationDispatchSnapshot[] = [
  {
    id: 101,
    templateSlug: "bienvenida-cohorte-email",
    templateTitle: "Bienvenida de cohorte",
    runSlug: "power-skills-pilot-open",
    runTitle: demoCourse.runLabel,
    channelCode: "email",
    status: "sent",
    personId: "demo-person",
    personName: "Sebastian Demo",
    personEmail: "demo@campus.local",
    renderedSubject: "Tu cohorte Cohorte mayo 2026 | abierta ya esta activa, Sebastian Demo",
    renderedBody: "Hola Sebastian Demo, ya puedes abrir el portal y revisar la primera experiencia de la ruta.",
    scheduledFor: "2026-05-05T14:00:00.000Z",
    sentAt: "2026-05-05T14:00:02.000Z",
    errorMessage: ""
  }
];

const demoNotificationCenter: NotificationCenterSnapshot = {
  preferences: {
    emailEnabled: true,
    webEnabled: false,
    updatedAt: "2026-05-05T14:00:00.000Z"
  },
  webPush: {
    supported: true,
    publicKey: "demo-vapid-public-key",
    activeSubscriptions: 0,
    lastSeenAt: null
  },
  recent: [
    {
      id: 101,
      channelCode: "email",
      status: "sent",
      subject: "Tu cohorte Cohorte mayo 2026 | abierta ya esta activa, Sebastian Demo",
      body: "Hola Sebastian Demo, ya puedes abrir el portal y revisar la primera experiencia de la ruta.",
      ctaLabel: "Abrir portal",
      ctaUrl: "/portal",
      sentAt: "2026-05-05T14:00:02.000Z",
      templateSlug: "bienvenida-cohorte-email",
      templateTitle: "Bienvenida de cohorte"
    }
  ]
};

export function getDemoCatalogSnapshot(): CourseSnapshot[] {
  return [demoCourse];
}

export function getDemoCourseSnapshot(slug: string): CourseSnapshot | undefined {
  return getDemoCatalogSnapshot().find((course) => course.slug === slug);
}

export function getDemoPortalSnapshot(): PortalSnapshot {
  return demoPortal;
}

export function getDemoNotificationCenterSnapshot(): NotificationCenterSnapshot {
  return demoNotificationCenter;
}

export function getDemoNotificationTemplates(): NotificationTemplateSnapshot[] {
  return demoNotificationTemplates;
}

export function getDemoNotificationDispatches(): NotificationDispatchSnapshot[] {
  return demoNotificationDispatches;
}

export function getDemoVerificationSnapshot(token: string): BadgeSnapshot | undefined {
  return token === demoBadge.token ? demoBadge : undefined;
}

export function getDemoVerificationTokens(): string[] {
  return [demoBadge.token];
}
