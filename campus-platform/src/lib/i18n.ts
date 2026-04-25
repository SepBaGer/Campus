export const SUPPORTED_LOCALES = ["es-CO", "en-US", "pt-BR"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "es-CO";
export const LOCALE_STORAGE_KEY = "mdg_locale";
export const LOCALE_CHANGE_EVENT = "campus-locale-change";

type TranslationDictionary = Record<string, string>;

const messages: Record<SupportedLocale, TranslationDictionary> = {
  "es-CO": {
    "locale.label": "Idioma",
    "locale.option.es-CO": "Espanol",
    "locale.option.en-US": "English",
    "locale.option.pt-BR": "Portugues (BR)",
    "layout.skip": "Saltar al contenido",
    "layout.brand.role": "aprendizaje premium guiado",
    "layout.nav.home": "Inicio",
    "layout.nav.catalog": "Catalogo",
    "layout.nav.access": "Acceso",
    "layout.nav.portal": "Portal",
    "layout.nav.admin": "Admin",
    "layout.theme.toggle": "Cambiar tema",
    "layout.cta.catalog": "Ver programas",
    "layout.footer.tagline":
      "Formacion guiada para pasar de la saturacion a una practica con metodo, IA y evidencia verificable.",
    "layout.footer.infrastructure":
      "La direccion visual se homologa con <a href=\"https://metodologia.info/\" rel=\"noreferrer\">metodologia.info</a> y el backend activo vive en <code>campus-platform/supabase</code>.",
    "page.home.cta.route": "Ver ruta principal",
    "page.catalog.eyebrow": "catalogo activo",
    "page.catalog.title": "Programas para convertir intencion en una practica sostenible.",
    "page.catalog.subtitle":
      "Este catalogo presenta las rutas como propuestas premium: promesa clara, cohorte visible, activacion simple y un cierre con evidencia verificable.",
    "page.catalog.pill.cohorts": "Cohortes guiadas",
    "page.catalog.pill.practice": "Practica aplicada",
    "page.catalog.pill.badge": "Badge verificable",
    "page.access.eyebrow": "entrar al campus",
    "page.access.title": "Acceso simple, rapido y sin friccion.",
    "page.access.subtitle":
      "Esta ruta mantiene el tono premium del campus y resuelve el ingreso con magic link o SSO corporativo para que el estudiante vuelva rapido a su progreso.",
    "page.portal.eyebrow": "portal del estudiante",
    "page.portal.title": "Tu progreso, tus siguientes pasos y tu evidencia final.",
    "page.portal.subtitle":
      "El portal resume el estado de la ruta, propone la siguiente accion y prepara el cierre verificable sin salir del universo visual del campus.",
    "page.admin.eyebrow": "operacion interna",
    "page.admin.title": "Panel privado para mantener cursos, cohortes y experiencias.",
    "page.admin.subtitle":
      "Esta superficie sigue siendo operativa, pero ahora conversa visualmente con el resto del producto para que la capa interna no se sienta ajena al campus publico.",
    "page.verify.eyebrow": "credencial verificable",
    "page.verify.title": "Comprueba una credencial emitida por el Campus.",
    "page.verify.subtitle":
      "Esta superficie publica mantiene la misma narrativa premium del producto y permite validar la evidencia final de un participante mediante su token.",
    "page.verify.pill.public": "Consulta publica",
    "page.verify.pill.token": "Token unico",
    "page.verify.pill.instant": "Respuesta inmediata",
    "page.verify.helperEyebrow": "usar esta vista",
    "page.verify.helperCopy":
      "Puedes llegar con <code>/verify/?token=...</code> o mediante una ruta directa <code>/verify/&lt;token&gt;</code>.",
    "course.meta.audience": "Dirigido a",
    "course.meta.access": "Acceso",
    "course.meta.rhythm": "Ritmo",
    "course.meta.competencies": "Competencias objetivo",
    "course.progress.visible": "Avance visible {percent}%",
    "magic.title": "Recibe tu enlace y vuelve directo al portal.",
    "magic.subtitle":
      "Indica tu correo y el sistema te enviara un acceso seguro para retomar tu ruta sin friccion.",
    "magic.badge": "Acceso por magic link",
    "magic.email": "Correo",
    "magic.submit": "Enviar enlace de acceso",
    "magic.submitting": "Enviando...",
    "magic.activeSession": "Ya hay una sesion activa para {email}. Puedes continuar directo al portal.",
    "magic.goPortal": "Ir al portal",
    "magic.demo":
      "Modo demo activo. Cuando el entorno publico este en live, este mismo flujo enviara el acceso real por correo.",
    "sso.badge": "Acceso enterprise",
    "sso.title": "Ingresa con tu organizacion y vuelve directo al portal.",
    "sso.subtitle":
      "Si tu cohorte usa Azure AD, Google Workspace u otro proveedor corporativo, puedes iniciar por dominio o con el provider ID tecnico compartido por tu equipo.",
    "sso.manualHint":
      "Puedes escribir tu correo corporativo, solo el dominio o usar el provider ID tecnico si tu tenant no publica botones dedicados.",
    "sso.emailOrDomain": "Correo corporativo o dominio",
    "sso.emailOrDomain.placeholder": "persona@empresa.com o empresa.com",
    "sso.providerToggle": "Tengo un provider ID tecnico",
    "sso.providerId": "Provider ID",
    "sso.providerId.placeholder": "21648a9d-8d5a-4555-a9d1-d6375dc14e92",
    "sso.submit": "Continuar con SSO corporativo",
    "sso.submitting": "Preparando SSO...",
    "sso.demo":
      "Modo demo activo. Cuando existan conexiones enterprise publicadas en Supabase, este flujo redirigira a tu proveedor corporativo.",
    "sso.redirecting": "Redirigiendo a tu proveedor corporativo para {target}...",
    "sso.error.invalid":
      "Escribe un correo corporativo valido, un dominio completo o pega un provider ID tecnico.",
    "sso.error.notConfigured":
      "Todavia no existe una conexion SSO publicada para ese dominio o provider ID en este proyecto.",
    "sso.error.disabled":
      "El carril SSO enterprise aun no esta habilitado en Supabase para este proyecto.",
    "sso.error.generic": "No pudimos iniciar el SSO corporativo. {detail}",
    "enrollment.email": "Correo",
    "enrollment.submitting": "Activando...",
    "enrollment.sessionHint":
      "Si ya existe una sesion, continuas directo al siguiente paso. Si no, el sistema te acompana con magic link.",
    "attempt.cta": "Registrar avance",
    "attempt.loading": "Registrando avance...",
    "attempt.project.missing": "Adjunta texto o enlace antes de enviar el proyecto para revision.",
    "attempt.project.submit": "Enviar proyecto",
    "attempt.done.default": "El avance quedo marcado y el sistema preparara la siguiente recomendacion.",
    "attempt.completion.recovered": "Credencial recuperada",
    "attempt.completion.issued": "Credencial emitida",
    "attempt.completion.submission": "Entrega registrada",
    "attempt.completion.progress": "Avance registrado",
    "attempt.review.waiting":
      "{title} ya quedo enviado{rubricSuffix} y ahora espera revision manual.",
    "attempt.review.suffix": " bajo la rubrica {rubricTitle}",
    "attempt.progress.nextReview":
      "{title} ya cuenta dentro de tu progreso y deja listo el siguiente repaso para {nextReviewAt}.",
    "attempt.result.progress": "Progreso total: {completedBlocks}/{totalBlocks} bloques ({progressPercent}%).",
    "attempt.result.competency": "Competencia reforzada: {competencyTitle} ({masteryPercent}%).",
    "attempt.result.pace":
      "Ritmo de repaso: {repetitions} repeticion(es), intervalo de {intervalDays} dia(s).",
    "attempt.result.status": "Estado: {status}.",
    "attempt.result.review": "Revision: {submissionStatus}.",
    "attempt.result.viewCredential": "Ver credencial",
    "attempt.result.openPortal": "Abrir portal",
    "attempt.project.rubric": "Este bloque se revisa manualmente con la rubrica {rubricTitle}.",
    "attempt.project.rubricFallback": "Este bloque se revisa manualmente con una rubrica del programa.",
    "attempt.project.evidence": "Evidencia principal",
    "attempt.project.supportUrl": "Enlace de apoyo",
    "attempt.project.note": "Nota para quien revisa",
    "attempt.interactive.ready":
      "Este bloque abre {toolTitle} mediante un launch LTI 1.3 seguro desde el Campus.",
    "attempt.interactive.open": "Abrir {toolTitle}",
    "attempt.interactive.complete": "Ya complete la practica",
    "attempt.interactive.launching": "Preparando launch seguro para {toolTitle}...",
    "attempt.interactive.launchingShort": "Abriendo herramienta...",
    "attempt.interactive.demo":
      "Modo demo: simulamos el launch LTI de {toolTitle} para mantener el flujo de practica.",
    "attempt.interactive.opened":
      "{toolTitle} ya se abrio en una nueva ventana. Cuando termines, vuelve y registra el cierre del bloque.",
    "attempt.interactive.embedded":
      "{toolTitle} ya esta cargando dentro del campus. Cuando termines, registra el cierre del bloque.",
    "attempt.interactive.notLaunched":
      "Abre primero la herramienta externa antes de registrar el cierre de esta practica.",
    "attempt.interactive.unconfigured":
      "Este bloque interactivo aun no tiene una configuracion LTI lista para launch.",
    "attempt.interactive.presentation": "Presentacion esperada: {value}.",
    "attempt.interactive.presentation.window": "nueva ventana",
    "attempt.interactive.presentation.iframe": "iframe embebido",
    "attempt.interactive.client": "Client ID: {value}.",
    "attempt.interactive.resource": "Resource link ID: {value}.",
    "attempt.voice.tip": "Este bloque admite dictado por voz en los campos textuales de la entrega.",
    "attempt.voice.unsupported":
      "El bloque admite dictado por voz, pero este navegador no expone la API necesaria.",
    "attempt.voice.start": "Dictar {fieldLabel}",
    "attempt.voice.stop": "Detener dictado",
    "attempt.voice.listening": "Escuchando para completar {fieldLabel}...",
    "attempt.voice.appended": "El dictado ya se anadio a {fieldLabel}.",
    "attempt.voice.error.unsupported": "Este navegador no soporta dictado por voz.",
    "attempt.voice.error.notAllowed": "Necesitas permitir el uso del microfono para dictar.",
    "attempt.voice.error.noSpeech": "No se detecto voz. Intenta de nuevo hablando mas cerca del microfono.",
    "attempt.voice.error.audioCapture": "No pudimos acceder al audio del dispositivo.",
    "attempt.voice.error.network": "La sesion de dictado se interrumpio por un problema de red.",
    "attempt.voice.error.generic": "No pudimos completar el dictado por voz en este intento.",
    "badge.awaiting": "Verificador listo",
    "badge.awaiting.copy": "Abre esta ruta con un token para consultar una credencial emitida por el Campus.",
    "badge.issuedAt": "Emitida: {value}",
    "badge.pending": "Pendiente",
    "badge.issuer": "Emisor: {value}",
    "badge.criteria": "Criterio: {value}",
    "badge.token": "Token: {value}",
    "badge.validating": "Validando token...",
    "schedule.suggested": "Sesion sugerida",
    "portal.loading": "Cargando portal...",
    "portal.signedOut.title": "Necesitas una sesion para ver tu portal real.",
    "portal.signedOut.copy":
      "Entra por acceso y vuelve a esta ruta para recuperar progreso, proximas acciones y tu credencial final.",
    "portal.signedOut.cta": "Ir a acceso",
    "portal.signedOut.back": "Volver al catalogo",
    "portal.credential.title": "Credencial verificable",
    "portal.credential.copy": "Tu cierre ya puede compartirse y validarse publicamente.",
    "portal.credential.open": "Abrir verificador publico",
    "portal.completed.title": "Ruta completada",
    "portal.completed.copy": "Ya puedes emitir o recuperar tu credencial verificable cuando quieras.",
    "portal.completed.cta": "Emitir o recuperar credencial",
    "portal.completed.loading": "Preparando credencial...",
    "portal.session.active": "Sesion activa: {email}",
    "portal.action.reused":
      "Recuperamos tu credencial existente para que puedas compartirla de nuevo.",
    "portal.action.issued": "La credencial verificable ya quedo emitida.",
    "portal.action.ready": "La credencial ya existia y quedo disponible de nuevo.",
    "portal.action.completed": "Completaste el cierre y la credencial ya esta lista.",
    "portal.signOut": "Cerrar sesion",
    "portal.progress.label": "Avance de cohorte",
    "portal.progress.detail": "{completedBlocks}/{totalBlocks} experiencias completadas",
    "portal.focus.title": "Tu siguiente foco",
    "portal.focus.route": "Ruta activa: {value}",
    "portal.focus.cohort": "Cohorte: {value}",
    "portal.focus.pace": "Ritmo actual: {value}",
    "portal.focus.reviews": "Reviews para hoy: {value}",
    "portal.focus.nextReview": "Proximo repaso: {value}",
    "portal.mastery.title": "Mapa de mastery por competencia",
    "portal.mastery.item": "{title} | Bloom {bloomLabel}",
    "portal.mastery.level": "Dominio actual: {percent}%.",
    "portal.mastery.nextReview": "Proximo repaso: {value}.",
    "portal.mastery.empty": "Aun sin review programado.",
    "portal.community.title": "Comunidad de cohorte",
    "portal.community.run": "Cohorte activa: {value}.",
    "portal.community.provider": "Proveedor: {value}.",
    "portal.community.provider.discourse": "Discourse",
    "portal.community.modes": "Superficies activas: {value}.",
    "portal.community.mode.forum": "foro guiado",
    "portal.community.mode.peer_review": "peer-review",
    "portal.community.peerReview.on": "Peer-review activo para revision entre pares.",
    "portal.community.peerReview.off": "Peer-review pausado en esta cohorte.",
    "portal.community.prompt": "Prompt de entrada: {value}.",
    "portal.community.expectation": "Regla de participacion",
    "portal.community.open": "{value}",
    "portal.community.loading": "Abriendo comunidad...",
    "portal.community.unavailable": "Esta cohorte aun no tiene una comunidad habilitada.",
    "portal.community.locked": "La comunidad existe, pero su launch LTI todavia no esta completo para esta cohorte.",
    "portal.community.launching": "Preparando launch seguro para {title}...",
    "portal.community.demo": "Modo demo: simulamos la apertura de {title} para conservar el flujo de cohorte.",
    "portal.community.embedded": "{title} ya esta cargando dentro del campus para esta cohorte.",
    "portal.community.opened": "{title} ya se abrio en una nueva ventana para continuar la conversacion.",
    "portal.gamification.title": "Racha y ritmo de ejecucion",
    "portal.gamification.ringLabel": "dias seguidos",
    "portal.gamification.detail": "{days} dia(s) seguidos con actividad real en la cohorte.",
    "portal.gamification.best": "Mejor racha: {value} dia(s).",
    "portal.gamification.xp": "XP acumulado: {value}.",
    "portal.gamification.rank": "Posicion actual: #{value}.",
    "portal.gamification.rankEmpty": "Posicion actual: activa el leaderboard para aparecer en el ranking.",
    "portal.gamification.participants": "Participantes visibles: {value}.",
    "portal.gamification.lastActivity": "Ultima actividad: {value}.",
    "portal.gamification.lastActivity.empty": "sin actividad registrada",
    "portal.gamification.toggle.enable": "Entrar al leaderboard",
    "portal.gamification.toggle.disable": "Salir del leaderboard",
    "portal.gamification.toggle.enabled": "Tu participacion en el leaderboard ya quedo activa.",
    "portal.gamification.toggle.disabled": "Tu participacion en el leaderboard ya quedo pausada.",
    "portal.leaderboard.title": "Leaderboard de cohorte",
    "portal.leaderboard.copy": "Comparte el ritmo solo si te suma: el ranking usa XP real y rachas de actividad.",
    "portal.leaderboard.locked": "Activa el opt-in para ver la tabla compartida de la cohorte.",
    "portal.leaderboard.empty": "Todavia no hay participantes visibles en este leaderboard.",
    "portal.leaderboard.you": "Tu",
    "portal.leaderboard.meta": "{totalXp} XP | racha {currentStreakDays} dia(s)",
    "portal.notification.title": "Centro de notificaciones",
    "portal.notification.email": "Email de cohorte",
    "portal.notification.email.on": "Activo para secuencias y recordatorios.",
    "portal.notification.email.off": "Pausado por ahora.",
    "portal.notification.email.pause": "Pausar email",
    "portal.notification.email.enable": "Activar email",
    "portal.notification.email.activated": "Los recordatorios por email quedaron activos.",
    "portal.notification.email.paused": "Los recordatorios por email quedaron pausados.",
    "portal.notification.web": "Web push",
    "portal.notification.web.active": "Este navegador ya quedo suscrito a la cohorte.",
    "portal.notification.web.ready": "Puedes activar alertas web para sesiones y checkpoints.",
    "portal.notification.web.unavailable": "Falta configurar VAPID o el navegador no soporta push.",
    "portal.notification.web.reactivate": "Reactivar web push",
    "portal.notification.web.enable": "Activar web push",
    "portal.notification.empty": "Aun no tienes notificaciones recientes en esta cohorte.",
    "portal.notification.open": "Abrir",
    "portal.notification.channel.email": "Email",
    "portal.notification.channel.web": "Web push",
    "portal.next.title": "Siguiente experiencia sugerida",
    "portal.next.done": "Todo el recorrido ya esta cubierto",
    "portal.next.done.copy":
      "La siguiente accion natural es abrir tu credencial o volver al catalogo para revisar otra ruta.",
    "portal.error.pushUnsupported": "Este navegador no soporta web push.",
    "portal.offline.title": "Acceso offline",
    "portal.offline.copy":
      "Puedes dejar esta ruta disponible sin conexion. Hoy hay {offlineCapableBlocks} bloque(s) marcados como aptos para continuidad offline.",
    "portal.offline.ready":
      "La ruta ya quedo preparada para continuidad offline con {routesCached} recurso(s) cacheados y {offlineCapableBlocks} bloque(s) listos.",
    "portal.offline.enable": "Activar offline",
    "portal.offline.disable": "Quitar cache offline",
    "portal.offline.loading": "Preparando offline...",
    "portal.offline.disabled": "El cache offline local ya fue retirado de este navegador.",
    "portal.offline.unsupported":
      "Este navegador no soporta el modo offline completo del campus.",
    "portal.offline.unavailable":
      "Esta ruta todavia no tiene bloques marcados como offline_capable para activar continuidad sin red.",
    "portal.offline.route": "Ruta preparada: {value}",
    "portal.offline.blocks": "Bloques offline_capable: {value}",
    "portal.offline.fallback": "Fallback de navegacion: {value}",
    "portal.offline.cachedAt": "Ultima preparacion local: {value}",
    "portal.offline.notCached": "aun no cacheado",
    "page.offline.eyebrow": "modo sin conexion",
    "page.offline.title": "El campus sigue disponible con el cache local.",
    "page.offline.subtitle":
      "Si ya activaste el acceso offline desde tu portal, aqui puedes volver al programa o esperar a que la conexion regrese para sincronizar de nuevo."
  },
  "en-US": {
    "locale.label": "Language",
    "locale.option.es-CO": "Spanish",
    "locale.option.en-US": "English",
    "locale.option.pt-BR": "Portuguese (BR)",
    "layout.skip": "Skip to content",
    "layout.brand.role": "guided premium learning",
    "layout.nav.home": "Home",
    "layout.nav.catalog": "Catalog",
    "layout.nav.access": "Access",
    "layout.nav.portal": "Portal",
    "layout.nav.admin": "Admin",
    "layout.theme.toggle": "Toggle theme",
    "layout.cta.catalog": "View programs",
    "layout.footer.tagline":
      "Guided learning to move from saturation into practice with method, AI, and verifiable evidence.",
    "layout.footer.infrastructure":
      "The visual direction matches <a href=\"https://metodologia.info/\" rel=\"noreferrer\">metodologia.info</a> and the active backend lives in <code>campus-platform/supabase</code>.",
    "page.home.cta.route": "View main path",
    "page.catalog.eyebrow": "active catalog",
    "page.catalog.title": "Programs to turn intention into sustainable practice.",
    "page.catalog.subtitle":
      "This catalog presents each path as a premium offer: clear promise, visible cohort, simple activation, and a finish with verifiable evidence.",
    "page.catalog.pill.cohorts": "Guided cohorts",
    "page.catalog.pill.practice": "Applied practice",
    "page.catalog.pill.badge": "Verifiable badge",
    "page.access.eyebrow": "enter campus",
    "page.access.title": "Simple, fast, frictionless access.",
    "page.access.subtitle":
      "This route keeps the premium tone of Campus and resolves entry with a magic link or enterprise SSO so the learner can quickly return to progress.",
    "page.portal.eyebrow": "student portal",
    "page.portal.title": "Your progress, your next steps, and your final evidence.",
    "page.portal.subtitle":
      "The portal summarizes the state of the path, proposes the next action, and prepares the verifiable finish without leaving the visual universe of Campus.",
    "page.admin.eyebrow": "internal operations",
    "page.admin.title": "Private panel to maintain courses, cohorts, and experiences.",
    "page.admin.subtitle":
      "This surface is still operational, but it now visually matches the rest of the product so the internal layer does not feel disconnected from the public campus.",
    "page.verify.eyebrow": "verifiable credential",
    "page.verify.title": "Verify a credential issued by Campus.",
    "page.verify.subtitle":
      "This public surface keeps the same premium narrative as the product and lets you validate a participant's final evidence with their token.",
    "page.verify.pill.public": "Public lookup",
    "page.verify.pill.token": "Unique token",
    "page.verify.pill.instant": "Instant response",
    "page.verify.helperEyebrow": "use this view",
    "page.verify.helperCopy":
      "You can arrive with <code>/verify/?token=...</code> or through a direct route <code>/verify/&lt;token&gt;</code>.",
    "course.meta.audience": "Audience",
    "course.meta.access": "Access",
    "course.meta.rhythm": "Cadence",
    "course.meta.competencies": "Target competencies",
    "course.progress.visible": "Visible progress {percent}%",
    "magic.title": "Receive your link and return straight to the portal.",
    "magic.subtitle":
      "Enter your email and the system will send a secure access link so you can resume your path without friction.",
    "magic.badge": "Magic link access",
    "magic.email": "Email",
    "magic.submit": "Send access link",
    "magic.submitting": "Sending...",
    "magic.activeSession": "There is already an active session for {email}. You can continue straight to the portal.",
    "magic.goPortal": "Go to portal",
    "magic.demo":
      "Demo mode is active. When the public environment is live, this same flow will send the real access email.",
    "sso.badge": "Enterprise access",
    "sso.title": "Sign in with your organization and return straight to the portal.",
    "sso.subtitle":
      "If your cohort uses Azure AD, Google Workspace, or another corporate provider, you can start with your domain or the technical provider ID shared by your team.",
    "sso.manualHint":
      "You can enter your corporate email, the raw domain, or the technical provider ID if your tenant does not publish dedicated buttons.",
    "sso.emailOrDomain": "Corporate email or domain",
    "sso.emailOrDomain.placeholder": "person@company.com or company.com",
    "sso.providerToggle": "I have a technical provider ID",
    "sso.providerId": "Provider ID",
    "sso.providerId.placeholder": "21648a9d-8d5a-4555-a9d1-d6375dc14e92",
    "sso.submit": "Continue with enterprise SSO",
    "sso.submitting": "Preparing SSO...",
    "sso.demo":
      "Demo mode is active. Once enterprise connections are published in Supabase, this flow will redirect to your corporate identity provider.",
    "sso.redirecting": "Redirecting to your corporate identity provider for {target}...",
    "sso.error.invalid":
      "Enter a valid corporate email, a full domain, or paste a technical provider ID.",
    "sso.error.notConfigured":
      "There is no published SSO connection for that domain or provider ID in this project yet.",
    "sso.error.disabled":
      "The enterprise SSO lane is not enabled in Supabase for this project yet.",
    "sso.error.generic": "We could not start enterprise SSO. {detail}",
    "enrollment.email": "Email",
    "enrollment.submitting": "Activating...",
    "enrollment.sessionHint":
      "If a session already exists, you continue straight to the next step. If not, the system follows up with a magic link.",
    "attempt.cta": "Record progress",
    "attempt.loading": "Recording progress...",
    "attempt.project.missing": "Attach text or a link before sending the project for review.",
    "attempt.project.submit": "Send project",
    "attempt.done.default": "Progress was recorded and the system will prepare the next recommendation.",
    "attempt.completion.recovered": "Credential recovered",
    "attempt.completion.issued": "Credential issued",
    "attempt.completion.submission": "Submission recorded",
    "attempt.completion.progress": "Progress recorded",
    "attempt.review.waiting":
      "{title} has been submitted{rubricSuffix} and is now waiting for manual review.",
    "attempt.review.suffix": " under the rubric {rubricTitle}",
    "attempt.progress.nextReview":
      "{title} now counts toward your progress and the next review is ready for {nextReviewAt}.",
    "attempt.result.progress": "Overall progress: {completedBlocks}/{totalBlocks} blocks ({progressPercent}%).",
    "attempt.result.competency": "Competency reinforced: {competencyTitle} ({masteryPercent}%).",
    "attempt.result.pace":
      "Review cadence: {repetitions} repetition(s), interval of {intervalDays} day(s).",
    "attempt.result.status": "Status: {status}.",
    "attempt.result.review": "Review: {submissionStatus}.",
    "attempt.result.viewCredential": "View credential",
    "attempt.result.openPortal": "Open portal",
    "attempt.project.rubric": "This block is reviewed manually with the rubric {rubricTitle}.",
    "attempt.project.rubricFallback": "This block is reviewed manually with a program rubric.",
    "attempt.project.evidence": "Main evidence",
    "attempt.project.supportUrl": "Supporting link",
    "attempt.project.note": "Note for reviewer",
    "attempt.interactive.ready":
      "This block opens {toolTitle} through a secure LTI 1.3 launch from Campus.",
    "attempt.interactive.open": "Open {toolTitle}",
    "attempt.interactive.complete": "I already completed the practice",
    "attempt.interactive.launching": "Preparing a secure launch for {toolTitle}...",
    "attempt.interactive.launchingShort": "Opening tool...",
    "attempt.interactive.demo":
      "Demo mode: we simulate the LTI launch for {toolTitle} so the practice flow stays coherent.",
    "attempt.interactive.opened":
      "{toolTitle} is already open in a new window. When you finish, come back and record the block completion.",
    "attempt.interactive.embedded":
      "{toolTitle} is loading inside Campus. When you finish, record the block completion.",
    "attempt.interactive.notLaunched":
      "Open the external tool first before recording completion for this practice.",
    "attempt.interactive.unconfigured":
      "This interactive block does not have an LTI launch configuration yet.",
    "attempt.interactive.presentation": "Expected presentation: {value}.",
    "attempt.interactive.presentation.window": "new window",
    "attempt.interactive.presentation.iframe": "embedded iframe",
    "attempt.interactive.client": "Client ID: {value}.",
    "attempt.interactive.resource": "Resource link ID: {value}.",
    "attempt.voice.tip": "This block supports voice dictation in the textual submission fields.",
    "attempt.voice.unsupported":
      "This block supports voice dictation, but this browser does not expose the required API.",
    "attempt.voice.start": "Dictate {fieldLabel}",
    "attempt.voice.stop": "Stop dictation",
    "attempt.voice.listening": "Listening to fill {fieldLabel}...",
    "attempt.voice.appended": "The dictated text was added to {fieldLabel}.",
    "attempt.voice.error.unsupported": "This browser does not support voice dictation.",
    "attempt.voice.error.notAllowed": "You need to allow microphone access before dictating.",
    "attempt.voice.error.noSpeech": "No speech was detected. Try again speaking closer to the microphone.",
    "attempt.voice.error.audioCapture": "We could not access the device audio input.",
    "attempt.voice.error.network": "The dictation session was interrupted by a network issue.",
    "attempt.voice.error.generic": "We could not complete voice dictation on this attempt.",
    "badge.awaiting": "Verifier ready",
    "badge.awaiting.copy": "Open this route with a token to inspect a credential issued by Campus.",
    "badge.issuedAt": "Issued: {value}",
    "badge.pending": "Pending",
    "badge.issuer": "Issuer: {value}",
    "badge.criteria": "Criteria: {value}",
    "badge.token": "Token: {value}",
    "badge.validating": "Validating token...",
    "schedule.suggested": "Suggested session",
    "portal.loading": "Loading portal...",
    "portal.signedOut.title": "You need a session to view your live portal.",
    "portal.signedOut.copy":
      "Sign in through access and come back here to recover progress, next actions, and your final credential.",
    "portal.signedOut.cta": "Go to access",
    "portal.signedOut.back": "Back to catalog",
    "portal.credential.title": "Verifiable credential",
    "portal.credential.copy": "Your finish can already be shared and validated publicly.",
    "portal.credential.open": "Open public verifier",
    "portal.completed.title": "Path completed",
    "portal.completed.copy": "You can now issue or recover your verifiable credential anytime.",
    "portal.completed.cta": "Issue or recover credential",
    "portal.completed.loading": "Preparing credential...",
    "portal.session.active": "Active session: {email}",
    "portal.action.reused":
      "We recovered your existing credential so you can share it again.",
    "portal.action.issued": "The verifiable credential has been issued.",
    "portal.action.ready": "The credential already existed and is available again.",
    "portal.action.completed": "You completed the path and the credential is ready.",
    "portal.signOut": "Sign out",
    "portal.progress.label": "Cohort progress",
    "portal.progress.detail": "{completedBlocks}/{totalBlocks} completed experiences",
    "portal.focus.title": "Your next focus",
    "portal.focus.route": "Active path: {value}",
    "portal.focus.cohort": "Cohort: {value}",
    "portal.focus.pace": "Current pace: {value}",
    "portal.focus.reviews": "Reviews due today: {value}",
    "portal.focus.nextReview": "Next review: {value}",
    "portal.mastery.title": "Competency mastery map",
    "portal.mastery.item": "{title} | Bloom {bloomLabel}",
    "portal.mastery.level": "Current mastery: {percent}%.",
    "portal.mastery.nextReview": "Next review: {value}.",
    "portal.mastery.empty": "No review scheduled yet.",
    "portal.community.title": "Cohort community",
    "portal.community.run": "Active cohort: {value}.",
    "portal.community.provider": "Provider: {value}.",
    "portal.community.provider.discourse": "Discourse",
    "portal.community.modes": "Active surfaces: {value}.",
    "portal.community.mode.forum": "guided forum",
    "portal.community.mode.peer_review": "peer review",
    "portal.community.peerReview.on": "Peer review is active for this cohort.",
    "portal.community.peerReview.off": "Peer review is paused for this cohort.",
    "portal.community.prompt": "Entry prompt: {value}.",
    "portal.community.expectation": "Participation guideline",
    "portal.community.open": "{value}",
    "portal.community.loading": "Opening community...",
    "portal.community.unavailable": "This cohort does not have an enabled community yet.",
    "portal.community.locked": "The community exists, but its LTI launch is not complete for this cohort yet.",
    "portal.community.launching": "Preparing a secure launch for {title}...",
    "portal.community.demo": "Demo mode: we simulate opening {title} to keep the cohort flow coherent.",
    "portal.community.embedded": "{title} is now loading inside Campus for this cohort.",
    "portal.community.opened": "{title} opened in a new window so you can continue the conversation.",
    "portal.gamification.title": "Streak and execution pace",
    "portal.gamification.ringLabel": "days in a row",
    "portal.gamification.detail": "{days} consecutive day(s) with real activity in the cohort.",
    "portal.gamification.best": "Best streak: {value} day(s).",
    "portal.gamification.xp": "Total XP: {value}.",
    "portal.gamification.rank": "Current rank: #{value}.",
    "portal.gamification.rankEmpty": "Current rank: enable the leaderboard to appear in the ranking.",
    "portal.gamification.participants": "Visible participants: {value}.",
    "portal.gamification.lastActivity": "Last activity: {value}.",
    "portal.gamification.lastActivity.empty": "no activity recorded yet",
    "portal.gamification.toggle.enable": "Join leaderboard",
    "portal.gamification.toggle.disable": "Leave leaderboard",
    "portal.gamification.toggle.enabled": "Your leaderboard participation is now active.",
    "portal.gamification.toggle.disabled": "Your leaderboard participation is now paused.",
    "portal.leaderboard.title": "Cohort leaderboard",
    "portal.leaderboard.copy": "Share your pace only if it helps: rankings are based on real XP and activity streaks.",
    "portal.leaderboard.locked": "Enable opt-in to see the shared cohort leaderboard.",
    "portal.leaderboard.empty": "There are no visible participants in this leaderboard yet.",
    "portal.leaderboard.you": "You",
    "portal.leaderboard.meta": "{totalXp} XP | streak {currentStreakDays} day(s)",
    "portal.notification.title": "Notification center",
    "portal.notification.email": "Cohort email",
    "portal.notification.email.on": "Active for sequences and reminders.",
    "portal.notification.email.off": "Paused for now.",
    "portal.notification.email.pause": "Pause email",
    "portal.notification.email.enable": "Enable email",
    "portal.notification.email.activated": "Email reminders are now active.",
    "portal.notification.email.paused": "Email reminders are now paused.",
    "portal.notification.web": "Web push",
    "portal.notification.web.active": "This browser is already subscribed to the cohort.",
    "portal.notification.web.ready": "You can enable web alerts for sessions and checkpoints.",
    "portal.notification.web.unavailable": "VAPID is not configured or this browser does not support push.",
    "portal.notification.web.reactivate": "Reactivate web push",
    "portal.notification.web.enable": "Enable web push",
    "portal.notification.empty": "You do not have recent notifications in this cohort yet.",
    "portal.notification.open": "Open",
    "portal.notification.channel.email": "Email",
    "portal.notification.channel.web": "Web push",
    "portal.next.title": "Suggested next experience",
    "portal.next.done": "The whole journey is already covered",
    "portal.next.done.copy":
      "The natural next action is to open your credential or return to the catalog to review another path.",
    "portal.error.pushUnsupported": "This browser does not support web push.",
    "portal.offline.title": "Offline access",
    "portal.offline.copy":
      "You can keep this path available without a connection. Right now there are {offlineCapableBlocks} block(s) marked as offline-ready.",
    "portal.offline.ready":
      "This path is already prepared for offline continuity with {routesCached} cached resource(s) and {offlineCapableBlocks} ready block(s).",
    "portal.offline.enable": "Enable offline",
    "portal.offline.disable": "Remove offline cache",
    "portal.offline.loading": "Preparing offline...",
    "portal.offline.disabled": "The local offline cache was removed from this browser.",
    "portal.offline.unsupported":
      "This browser does not support the full Campus offline mode.",
    "portal.offline.unavailable":
      "This path does not yet have any blocks marked as offline_capable for no-network continuity.",
    "portal.offline.route": "Prepared path: {value}",
    "portal.offline.blocks": "Offline-capable blocks: {value}",
    "portal.offline.fallback": "Navigation fallback: {value}",
    "portal.offline.cachedAt": "Last local preparation: {value}",
    "portal.offline.notCached": "not cached yet",
    "page.offline.eyebrow": "offline mode",
    "page.offline.title": "Campus is still available through the local cache.",
    "page.offline.subtitle":
      "If you already enabled offline access from your portal, you can return to the program here or wait for the connection to come back before syncing again."
  },
  "pt-BR": {
    "locale.label": "Idioma",
    "locale.option.es-CO": "Espanhol",
    "locale.option.en-US": "English",
    "locale.option.pt-BR": "Portugues (BR)",
    "layout.skip": "Pular para o conteudo",
    "layout.brand.role": "aprendizagem premium guiada",
    "layout.nav.home": "Inicio",
    "layout.nav.catalog": "Catalogo",
    "layout.nav.access": "Acesso",
    "layout.nav.portal": "Portal",
    "layout.nav.admin": "Admin",
    "layout.theme.toggle": "Alternar tema",
    "layout.cta.catalog": "Ver programas",
    "layout.footer.tagline":
      "Aprendizagem guiada para sair da saturacao e entrar em uma pratica com metodo, IA e evidencia verificavel.",
    "layout.footer.infrastructure":
      "A direcao visual acompanha <a href=\"https://metodologia.info/\" rel=\"noreferrer\">metodologia.info</a> e o backend ativo vive em <code>campus-platform/supabase</code>.",
    "page.home.cta.route": "Ver jornada principal",
    "page.catalog.eyebrow": "catalogo ativo",
    "page.catalog.title": "Programas para transformar intencao em uma pratica sustentavel.",
    "page.catalog.subtitle":
      "Este catalogo apresenta as jornadas como propostas premium: promessa clara, coorte visivel, ativacao simples e um fechamento com evidencia verificavel.",
    "page.catalog.pill.cohorts": "Coortes guiadas",
    "page.catalog.pill.practice": "Pratica aplicada",
    "page.catalog.pill.badge": "Badge verificavel",
    "page.access.eyebrow": "entrar no campus",
    "page.access.title": "Acesso simples, rapido e sem friccao.",
    "page.access.subtitle":
      "Esta rota mantem o tom premium do Campus e resolve a entrada com magic link ou SSO corporativo para que o estudante volte rapido ao seu progresso.",
    "page.portal.eyebrow": "portal do estudante",
    "page.portal.title": "Seu progresso, seus proximos passos e sua evidencia final.",
    "page.portal.subtitle":
      "O portal resume o estado da jornada, propoe a proxima acao e prepara o fechamento verificavel sem sair do universo visual do Campus.",
    "page.admin.eyebrow": "operacao interna",
    "page.admin.title": "Painel privado para manter cursos, coortes e experiencias.",
    "page.admin.subtitle":
      "Esta superficie continua operativa, mas agora conversa visualmente com o restante do produto para que a camada interna nao pareca alheia ao campus publico.",
    "page.verify.eyebrow": "credencial verificavel",
    "page.verify.title": "Confira uma credencial emitida pelo Campus.",
    "page.verify.subtitle":
      "Esta superficie publica mantem a mesma narrativa premium do produto e permite validar a evidencia final de um participante usando seu token.",
    "page.verify.pill.public": "Consulta publica",
    "page.verify.pill.token": "Token unico",
    "page.verify.pill.instant": "Resposta imediata",
    "page.verify.helperEyebrow": "usar esta vista",
    "page.verify.helperCopy":
      "Voce pode chegar com <code>/verify/?token=...</code> ou por uma rota direta <code>/verify/&lt;token&gt;</code>.",
    "course.meta.audience": "Para quem",
    "course.meta.access": "Acesso",
    "course.meta.rhythm": "Ritmo",
    "course.meta.competencies": "Competencias alvo",
    "course.progress.visible": "Progresso visivel {percent}%",
    "magic.title": "Receba seu link e volte direto para o portal.",
    "magic.subtitle":
      "Informe seu email e o sistema enviara um acesso seguro para retomar sua jornada sem friccao.",
    "magic.badge": "Acesso por magic link",
    "magic.email": "Email",
    "magic.submit": "Enviar link de acesso",
    "magic.submitting": "Enviando...",
    "magic.activeSession": "Ja existe uma sessao ativa para {email}. Voce pode seguir direto para o portal.",
    "magic.goPortal": "Ir para o portal",
    "magic.demo":
      "O modo demo esta ativo. Quando o ambiente publico estiver live, este mesmo fluxo enviara o acesso real por email.",
    "sso.badge": "Acesso enterprise",
    "sso.title": "Entre com sua organizacao e volte direto para o portal.",
    "sso.subtitle":
      "Se sua coorte usa Azure AD, Google Workspace ou outro provedor corporativo, voce pode iniciar pelo dominio ou pelo provider ID tecnico compartilhado pelo seu time.",
    "sso.manualHint":
      "Voce pode informar seu email corporativo, apenas o dominio ou usar o provider ID tecnico se o tenant nao publicar botoes dedicados.",
    "sso.emailOrDomain": "Email corporativo ou dominio",
    "sso.emailOrDomain.placeholder": "pessoa@empresa.com ou empresa.com",
    "sso.providerToggle": "Tenho um provider ID tecnico",
    "sso.providerId": "Provider ID",
    "sso.providerId.placeholder": "21648a9d-8d5a-4555-a9d1-d6375dc14e92",
    "sso.submit": "Continuar com SSO corporativo",
    "sso.submitting": "Preparando SSO...",
    "sso.demo":
      "O modo demo esta ativo. Quando existirem conexoes enterprise publicadas no Supabase, este fluxo redirecionara voce ao provedor corporativo.",
    "sso.redirecting": "Redirecionando ao provedor corporativo para {target}...",
    "sso.error.invalid":
      "Informe um email corporativo valido, um dominio completo ou cole um provider ID tecnico.",
    "sso.error.notConfigured":
      "Ainda nao existe uma conexao SSO publicada para esse dominio ou provider ID neste projeto.",
    "sso.error.disabled":
      "A trilha de SSO enterprise ainda nao esta habilitada no Supabase para este projeto.",
    "sso.error.generic": "Nao foi possivel iniciar o SSO corporativo. {detail}",
    "enrollment.email": "Email",
    "enrollment.submitting": "Ativando...",
    "enrollment.sessionHint":
      "Se ja existir uma sessao, voce segue direto para o proximo passo. Se nao, o sistema acompanha com magic link.",
    "attempt.cta": "Registrar progresso",
    "attempt.loading": "Registrando progresso...",
    "attempt.project.missing": "Anexe texto ou link antes de enviar o projeto para revisao.",
    "attempt.project.submit": "Enviar projeto",
    "attempt.done.default": "O progresso foi registrado e o sistema preparara a proxima recomendacao.",
    "attempt.completion.recovered": "Credencial recuperada",
    "attempt.completion.issued": "Credencial emitida",
    "attempt.completion.submission": "Entrega registrada",
    "attempt.completion.progress": "Progresso registrado",
    "attempt.review.waiting":
      "{title} foi enviado{rubricSuffix} e agora aguarda revisao manual.",
    "attempt.review.suffix": " com a rubrica {rubricTitle}",
    "attempt.progress.nextReview":
      "{title} ja conta no seu progresso e deixa a proxima revisao pronta para {nextReviewAt}.",
    "attempt.result.progress": "Progresso total: {completedBlocks}/{totalBlocks} blocos ({progressPercent}%).",
    "attempt.result.competency": "Competencia reforcada: {competencyTitle} ({masteryPercent}%).",
    "attempt.result.pace":
      "Ritmo de revisao: {repetitions} repeticao(oes), intervalo de {intervalDays} dia(s).",
    "attempt.result.status": "Status: {status}.",
    "attempt.result.review": "Revisao: {submissionStatus}.",
    "attempt.result.viewCredential": "Ver credencial",
    "attempt.result.openPortal": "Abrir portal",
    "attempt.project.rubric": "Este bloco e revisado manualmente com a rubrica {rubricTitle}.",
    "attempt.project.rubricFallback": "Este bloco e revisado manualmente com uma rubrica do programa.",
    "attempt.project.evidence": "Evidencia principal",
    "attempt.project.supportUrl": "Link de apoio",
    "attempt.project.note": "Nota para quem revisa",
    "attempt.interactive.ready":
      "Este bloco abre {toolTitle} por meio de um launch LTI 1.3 seguro a partir do Campus.",
    "attempt.interactive.open": "Abrir {toolTitle}",
    "attempt.interactive.complete": "Ja conclui a pratica",
    "attempt.interactive.launching": "Preparando launch seguro para {toolTitle}...",
    "attempt.interactive.launchingShort": "Abrindo ferramenta...",
    "attempt.interactive.demo":
      "Modo demo: simulamos o launch LTI de {toolTitle} para manter o fluxo da pratica coerente.",
    "attempt.interactive.opened":
      "{toolTitle} ja foi aberto em uma nova janela. Quando terminar, volte e registre o fechamento do bloco.",
    "attempt.interactive.embedded":
      "{toolTitle} ja esta carregando dentro do Campus. Quando terminar, registre o fechamento do bloco.",
    "attempt.interactive.notLaunched":
      "Abra primeiro a ferramenta externa antes de registrar o fechamento desta pratica.",
    "attempt.interactive.unconfigured":
      "Este bloco interativo ainda nao tem uma configuracao LTI pronta para launch.",
    "attempt.interactive.presentation": "Apresentacao esperada: {value}.",
    "attempt.interactive.presentation.window": "nova janela",
    "attempt.interactive.presentation.iframe": "iframe embutido",
    "attempt.interactive.client": "Client ID: {value}.",
    "attempt.interactive.resource": "Resource link ID: {value}.",
    "attempt.voice.tip": "Este bloco admite ditado por voz nos campos textuais da entrega.",
    "attempt.voice.unsupported":
      "Este bloco admite ditado por voz, mas este navegador nao expoe a API necessaria.",
    "attempt.voice.start": "Ditar {fieldLabel}",
    "attempt.voice.stop": "Parar ditado",
    "attempt.voice.listening": "Ouvindo para completar {fieldLabel}...",
    "attempt.voice.appended": "O texto ditado foi adicionado a {fieldLabel}.",
    "attempt.voice.error.unsupported": "Este navegador nao suporta ditado por voz.",
    "attempt.voice.error.notAllowed": "Voce precisa permitir o uso do microfone antes de ditar.",
    "attempt.voice.error.noSpeech": "Nenhuma fala foi detectada. Tente novamente falando mais perto do microfone.",
    "attempt.voice.error.audioCapture": "Nao conseguimos acessar o audio do dispositivo.",
    "attempt.voice.error.network": "A sessao de ditado foi interrompida por um problema de rede.",
    "attempt.voice.error.generic": "Nao foi possivel concluir o ditado por voz nesta tentativa.",
    "badge.awaiting": "Verificador pronto",
    "badge.awaiting.copy": "Abra esta rota com um token para consultar uma credencial emitida pelo Campus.",
    "badge.issuedAt": "Emitida: {value}",
    "badge.pending": "Pendente",
    "badge.issuer": "Emissor: {value}",
    "badge.criteria": "Criterio: {value}",
    "badge.token": "Token: {value}",
    "badge.validating": "Validando token...",
    "schedule.suggested": "Sessao sugerida",
    "portal.loading": "Carregando portal...",
    "portal.signedOut.title": "Voce precisa de uma sessao para ver seu portal live.",
    "portal.signedOut.copy":
      "Entre por acesso e volte a esta rota para recuperar progresso, proximas acoes e sua credencial final.",
    "portal.signedOut.cta": "Ir para acesso",
    "portal.signedOut.back": "Voltar ao catalogo",
    "portal.credential.title": "Credencial verificavel",
    "portal.credential.copy": "Seu fechamento ja pode ser compartilhado e validado publicamente.",
    "portal.credential.open": "Abrir verificador publico",
    "portal.completed.title": "Jornada concluida",
    "portal.completed.copy": "Agora voce pode emitir ou recuperar sua credencial verificavel quando quiser.",
    "portal.completed.cta": "Emitir ou recuperar credencial",
    "portal.completed.loading": "Preparando credencial...",
    "portal.session.active": "Sessao ativa: {email}",
    "portal.action.reused":
      "Recuperamos sua credencial existente para que voce possa compartilha-la novamente.",
    "portal.action.issued": "A credencial verificavel ja foi emitida.",
    "portal.action.ready": "A credencial ja existia e ficou disponivel novamente.",
    "portal.action.completed": "Voce concluiu o fechamento e a credencial ja esta pronta.",
    "portal.signOut": "Encerrar sessao",
    "portal.progress.label": "Progresso da coorte",
    "portal.progress.detail": "{completedBlocks}/{totalBlocks} experiencias concluidas",
    "portal.focus.title": "Seu proximo foco",
    "portal.focus.route": "Jornada ativa: {value}",
    "portal.focus.cohort": "Coorte: {value}",
    "portal.focus.pace": "Ritmo atual: {value}",
    "portal.focus.reviews": "Revisoes para hoje: {value}",
    "portal.focus.nextReview": "Proxima revisao: {value}",
    "portal.mastery.title": "Mapa de mastery por competencia",
    "portal.mastery.item": "{title} | Bloom {bloomLabel}",
    "portal.mastery.level": "Dominio atual: {percent}%.",
    "portal.mastery.nextReview": "Proxima revisao: {value}.",
    "portal.mastery.empty": "Ainda sem revisao programada.",
    "portal.community.title": "Comunidade da coorte",
    "portal.community.run": "Coorte ativa: {value}.",
    "portal.community.provider": "Provedor: {value}.",
    "portal.community.provider.discourse": "Discourse",
    "portal.community.modes": "Superficies ativas: {value}.",
    "portal.community.mode.forum": "forum guiado",
    "portal.community.mode.peer_review": "peer review",
    "portal.community.peerReview.on": "Peer review ativo para esta coorte.",
    "portal.community.peerReview.off": "Peer review pausado nesta coorte.",
    "portal.community.prompt": "Prompt de entrada: {value}.",
    "portal.community.expectation": "Regra de participacao",
    "portal.community.open": "{value}",
    "portal.community.loading": "Abrindo comunidade...",
    "portal.community.unavailable": "Esta coorte ainda nao tem uma comunidade habilitada.",
    "portal.community.locked": "A comunidade existe, mas o launch LTI ainda nao ficou completo para esta coorte.",
    "portal.community.launching": "Preparando launch seguro para {title}...",
    "portal.community.demo": "Modo demo: simulamos a abertura de {title} para manter o fluxo da coorte coerente.",
    "portal.community.embedded": "{title} ja esta carregando dentro do Campus para esta coorte.",
    "portal.community.opened": "{title} foi aberto em uma nova janela para continuar a conversa.",
    "portal.gamification.title": "Sequencia e ritmo de execucao",
    "portal.gamification.ringLabel": "dias seguidos",
    "portal.gamification.detail": "{days} dia(s) seguidos com atividade real na coorte.",
    "portal.gamification.best": "Melhor sequencia: {value} dia(s).",
    "portal.gamification.xp": "XP acumulado: {value}.",
    "portal.gamification.rank": "Posicao atual: #{value}.",
    "portal.gamification.rankEmpty": "Posicao atual: ative o leaderboard para aparecer no ranking.",
    "portal.gamification.participants": "Participantes visiveis: {value}.",
    "portal.gamification.lastActivity": "Ultima atividade: {value}.",
    "portal.gamification.lastActivity.empty": "sem atividade registrada",
    "portal.gamification.toggle.enable": "Entrar no leaderboard",
    "portal.gamification.toggle.disable": "Sair do leaderboard",
    "portal.gamification.toggle.enabled": "Sua participacao no leaderboard ja ficou ativa.",
    "portal.gamification.toggle.disabled": "Sua participacao no leaderboard ja ficou pausada.",
    "portal.leaderboard.title": "Leaderboard da coorte",
    "portal.leaderboard.copy": "Compartilhe o ritmo so se isso somar: o ranking usa XP real e sequencias de atividade.",
    "portal.leaderboard.locked": "Ative o opt-in para ver a tabela compartilhada da coorte.",
    "portal.leaderboard.empty": "Ainda nao ha participantes visiveis neste leaderboard.",
    "portal.leaderboard.you": "Voce",
    "portal.leaderboard.meta": "{totalXp} XP | sequencia {currentStreakDays} dia(s)",
    "portal.notification.title": "Central de notificacoes",
    "portal.notification.email": "Email da coorte",
    "portal.notification.email.on": "Ativo para sequencias e lembretes.",
    "portal.notification.email.off": "Pausado por enquanto.",
    "portal.notification.email.pause": "Pausar email",
    "portal.notification.email.enable": "Ativar email",
    "portal.notification.email.activated": "Os lembretes por email ficaram ativos.",
    "portal.notification.email.paused": "Os lembretes por email ficaram pausados.",
    "portal.notification.web": "Web push",
    "portal.notification.web.active": "Este navegador ja esta inscrito na coorte.",
    "portal.notification.web.ready": "Voce pode ativar alertas web para sessoes e checkpoints.",
    "portal.notification.web.unavailable": "Falta configurar VAPID ou este navegador nao suporta push.",
    "portal.notification.web.reactivate": "Reativar web push",
    "portal.notification.web.enable": "Ativar web push",
    "portal.notification.empty": "Voce ainda nao tem notificacoes recentes nesta coorte.",
    "portal.notification.open": "Abrir",
    "portal.notification.channel.email": "Email",
    "portal.notification.channel.web": "Web push",
    "portal.next.title": "Proxima experiencia sugerida",
    "portal.next.done": "Todo o percurso ja esta coberto",
    "portal.next.done.copy":
      "A proxima acao natural e abrir sua credencial ou voltar ao catalogo para revisar outra jornada.",
    "portal.error.pushUnsupported": "Este navegador nao suporta web push.",
    "portal.offline.title": "Acesso offline",
    "portal.offline.copy":
      "Voce pode deixar esta jornada disponivel sem conexao. Hoje existem {offlineCapableBlocks} bloco(s) marcados como aptos para continuidade offline.",
    "portal.offline.ready":
      "Esta jornada ja foi preparada para continuidade offline com {routesCached} recurso(s) em cache e {offlineCapableBlocks} bloco(s) prontos.",
    "portal.offline.enable": "Ativar offline",
    "portal.offline.disable": "Remover cache offline",
    "portal.offline.loading": "Preparando offline...",
    "portal.offline.disabled": "O cache offline local foi removido deste navegador.",
    "portal.offline.unsupported":
      "Este navegador nao suporta o modo offline completo do campus.",
    "portal.offline.unavailable":
      "Esta jornada ainda nao possui blocos marcados como offline_capable para continuidade sem rede.",
    "portal.offline.route": "Jornada preparada: {value}",
    "portal.offline.blocks": "Blocos offline_capable: {value}",
    "portal.offline.fallback": "Fallback de navegacao: {value}",
    "portal.offline.cachedAt": "Ultima preparacao local: {value}",
    "portal.offline.notCached": "ainda nao armazenado",
    "page.offline.eyebrow": "modo offline",
    "page.offline.title": "O campus continua disponivel pelo cache local.",
    "page.offline.subtitle":
      "Se voce ja ativou o acesso offline pelo portal, aqui pode voltar para a jornada ou esperar a conexao voltar antes de sincronizar novamente."
  }
};

function interpolate(template: string, variables?: Record<string, string | number | null | undefined>) {
  if (!variables) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = variables[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

function hasDocument() {
  return typeof document !== "undefined";
}

function hasWindow() {
  return typeof window !== "undefined";
}

export function normalizeLocale(value?: string | null): SupportedLocale {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("en")) {
    return "en-US";
  }
  if (normalized.startsWith("pt")) {
    return "pt-BR";
  }
  if (normalized.startsWith("es")) {
    return "es-CO";
  }

  return DEFAULT_LOCALE;
}

export function getLocaleOptions() {
  return SUPPORTED_LOCALES.map((locale) => ({
    value: locale,
    label: translate(DEFAULT_LOCALE, `locale.option.${locale}`)
  }));
}

export function getTranslationMessages(locale: SupportedLocale) {
  return messages[normalizeLocale(locale)];
}

export function translate(
  locale: SupportedLocale,
  key: string,
  variables?: Record<string, string | number | null | undefined>
) {
  const dictionary = getTranslationMessages(locale);
  const template = dictionary[key] || messages[DEFAULT_LOCALE][key] || key;
  return interpolate(template, variables);
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
) {
  if (!value) {
    return "";
  }

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(normalizeLocale(locale), options).format(dateValue);
}

export function formatPercent(value: number, locale: SupportedLocale) {
  return new Intl.NumberFormat(normalizeLocale(locale), {
    maximumFractionDigits: 0
  }).format(value);
}

export function readStoredLocale() {
  if (!hasWindow()) {
    return null;
  }

  try {
    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function resolveNavigatorLocale() {
  if (!hasWindow()) {
    return DEFAULT_LOCALE;
  }

  return normalizeLocale(window.navigator.language);
}

export function getActiveLocale() {
  if (!hasDocument()) {
    return DEFAULT_LOCALE;
  }

  return normalizeLocale(
    document.documentElement.dataset.locale
    || document.documentElement.lang
    || readStoredLocale()
    || resolveNavigatorLocale()
  );
}

export function applyLocaleToDocument(locale: SupportedLocale) {
  if (!hasDocument()) {
    return;
  }

  document.documentElement.dataset.locale = locale;
  document.documentElement.lang = locale;
}

export function setActiveLocale(locale: SupportedLocale, options?: { persist?: boolean; dispatch?: boolean }) {
  const normalized = normalizeLocale(locale);
  applyLocaleToDocument(normalized);

  if (options?.persist !== false && hasWindow()) {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
    } catch {
      // ignore storage errors in private mode
    }
  }

  if (options?.dispatch !== false && hasWindow()) {
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, {
      detail: { locale: normalized }
    }));
  }
}

function parseVariables(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string | number | null | undefined>;
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function translateDocument(root: ParentNode = document, locale = getActiveLocale()) {
  const elements = root.querySelectorAll<HTMLElement>("[data-i18n]");

  elements.forEach((element) => {
    const key = element.dataset.i18n;
    if (!key) {
      return;
    }

    const text = translate(locale, key, parseVariables(element.dataset.i18nVars));
    const targetAttributes = (element.dataset.i18nAttr || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (targetAttributes.length) {
      targetAttributes.forEach((attributeName) => {
        element.setAttribute(attributeName, text);
      });
      return;
    }

    if (element.dataset.i18nHtml === "true") {
      element.innerHTML = text;
      return;
    }

    element.textContent = text;
  });
}

export function translateChannelCode(locale: SupportedLocale, channelCode: "email" | "web") {
  return translate(locale, `portal.notification.channel.${channelCode}`);
}
