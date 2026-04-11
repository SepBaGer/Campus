const now = Date.now();

export const demoSeed = {
  sessionUserId: 'demo-user-1',
  profiles: [
    {
      id: 'demo-user-1',
      email: 'demo@campus.local',
      display_name: 'Sebastian Demo',
      avatar_url: '',
      membership_plan: 'premium',
      membership_status: 'active',
      current_level: 4,
      total_xp: 1180,
      bio: 'Explorando el nuevo programa de empoderamiento en modo demo.'
    },
    {
      id: 'demo-user-2',
      email: 'camila@campus.local',
      display_name: 'Camila Growth',
      avatar_url: '',
      membership_plan: 'premium',
      membership_status: 'active',
      current_level: 4,
      total_xp: 2840,
      bio: 'Metodo primero, sistemas despues.'
    },
    {
      id: 'demo-user-3',
      email: 'andres@campus.local',
      display_name: 'Andres Ops',
      avatar_url: '',
      membership_plan: 'basic',
      membership_status: 'active',
      current_level: 2,
      total_xp: 780,
      bio: 'Implementando productividad con trabajo agentico.'
    }
  ],
  levels: [
    {
      id: 1,
      orden: 0,
      titulo: 'M1 - S1 - Sin costo',
      descripcion: 'De Ocupado a Productivo. 2 versiones: Metodo o IA.',
      color_hex: '#C9A227'
    },
    {
      id: 2,
      orden: 1,
      titulo: 'S2 - Operativa',
      descripcion: 'Bienvenida y Nivelacion. No es modulo; semana operativa.',
      color_hex: '#137DC5'
    },
    {
      id: 3,
      orden: 2,
      titulo: 'Parte 1 - Metodo',
      descripcion: 'Semanas 3 a 8. Ruta de M2 a M7.',
      color_hex: '#C9A227'
    },
    {
      id: 4,
      orden: 3,
      titulo: 'Parte 2 - IA Aplicada',
      descripcion: 'Semanas 9 a 15. Ruta de M8 a M13.',
      color_hex: '#D3A00F'
    },
    {
      id: 5,
      orden: 4,
      titulo: 'M14 - S16',
      descripcion: 'Empoderamiento. Cierre y Embajadores.',
      color_hex: '#1F2937'
    }
  ],
  lessons: [
    {
      id: 101,
      level_id: 1,
      orden: 1,
      titulo: 'M1 - S1 - De Ocupado a Productivo',
      descripcion: '2 versiones: Metodo o IA',
      tipo: 'video',
      duracion_minutos: 18,
      xp_reward: 120,
      is_free: true,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M1 - S1\n\n## De Ocupado a Productivo\n\n2 versiones: Metodo o IA.\n\n- Best Practices: pensamiento estructurado, rituales y calendario sistemico.\n- Trabajo Agentico: orquestacion multi-agentica, Pristino y diseno de sistemas.'
    },
    {
      id: 201,
      level_id: 2,
      orden: 1,
      titulo: 'S2 - Operativa - Bienvenida y Nivelacion',
      descripcion: 'No es modulo - semana operativa',
      tipo: 'mixed',
      duracion_minutos: 20,
      xp_reward: 140,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# S2 - Operativa\n\n## Bienvenida y Nivelacion\n\nConfiguras entorno, completas Brujula y recibes primeros aceleradores.'
    },
    {
      id: 301,
      level_id: 3,
      orden: 1,
      titulo: 'M2 - S3 - Del Automatismo a la Presencia',
      descripcion: 'Proposito & ROI',
      tipo: 'video',
      duracion_minutos: 24,
      xp_reward: 160,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M2 - S3\n\n## Del Automatismo a la Presencia\n\nSubtitulo: Proposito & ROI.'
    },
    {
      id: 302,
      level_id: 3,
      orden: 2,
      titulo: 'M3 - S4 - De Cumplir a Sorprender',
      descripcion: 'Pensamiento Estructurado',
      tipo: 'video',
      duracion_minutos: 28,
      xp_reward: 170,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M3 - S4\n\n## De Cumplir a Sorprender\n\nSubtitulo: Pensamiento Estructurado.'
    },
    {
      id: 303,
      level_id: 3,
      orden: 3,
      titulo: 'M4 - S5 - De Trabajar Duro a Sin Friccion',
      descripcion: 'Deep Research',
      tipo: 'mixed',
      duracion_minutos: 30,
      xp_reward: 180,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M4 - S5\n\n## De Trabajar Duro a Sin Friccion\n\nSubtitulo: Deep Research.'
    },
    {
      id: 304,
      level_id: 3,
      orden: 4,
      titulo: 'M5 - S6 - De Caoticos a Estrategicos',
      descripcion: 'Systemic Copywriting',
      tipo: 'text',
      duracion_minutos: 26,
      xp_reward: 180,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M5 - S6\n\n## De Caoticos a Estrategicos\n\nSubtitulo: Systemic Copywriting.'
    },
    {
      id: 305,
      level_id: 3,
      orden: 5,
      titulo: 'M6 - S7 - De sin Estructura a Alto Desempeno',
      descripcion: 'Data Intelligence',
      tipo: 'video',
      duracion_minutos: 27,
      xp_reward: 190,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M6 - S7\n\n## De sin Estructura a Alto Desempeno\n\nSubtitulo: Data Intelligence.'
    },
    {
      id: 306,
      level_id: 3,
      orden: 6,
      titulo: 'M7 - S8 - De Efectivas a Alto Rendimiento',
      descripcion: 'Visual Engine',
      tipo: 'mixed',
      duracion_minutos: 29,
      xp_reward: 190,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M7 - S8\n\n## De Efectivas a Alto Rendimiento\n\nSubtitulo: Visual Engine.'
    },
    {
      id: 401,
      level_id: 4,
      orden: 1,
      titulo: 'M8 - S9 - De Bocetos a Prototipos con IA',
      descripcion: 'Autonomous Agents',
      tipo: 'video',
      duracion_minutos: 31,
      xp_reward: 210,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M8 - S9\n\n## De Bocetos a Prototipos con IA\n\nSubtitulo: Autonomous Agents.'
    },
    {
      id: 402,
      level_id: 4,
      orden: 2,
      titulo: 'M9 - S10 - De Convencional a Sorprendente',
      descripcion: 'Stack Optimization',
      tipo: 'text',
      duracion_minutos: 23,
      xp_reward: 200,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M9 - S10\n\n## De Convencional a Sorprendente\n\nSubtitulo: Stack Optimization.'
    },
    {
      id: 403,
      level_id: 4,
      orden: 3,
      titulo: 'M10 - S11 - Productividad Aumentada',
      descripcion: 'No-Code Systems',
      tipo: 'mixed',
      duracion_minutos: 25,
      xp_reward: 210,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M10 - S11\n\n## Productividad Aumentada\n\nSubtitulo: No-Code Systems.'
    },
    {
      id: 404,
      level_id: 4,
      orden: 4,
      titulo: 'M11 - S12 - Trabajo Amplificado',
      descripcion: 'Custom Engines',
      tipo: 'video',
      duracion_minutos: 33,
      xp_reward: 220,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M11 - S12\n\n## Trabajo Amplificado\n\nSubtitulo: Custom Engines.'
    },
    {
      id: 405,
      level_id: 4,
      orden: 5,
      titulo: 'M12 - S13-14 - De Manual a Automatizado',
      descripcion: 'Real Solutions',
      tipo: 'mixed',
      duracion_minutos: 45,
      xp_reward: 260,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M12 - S13-14\n\n## De Manual a Automatizado\n\nSubtitulo: Real Solutions.'
    },
    {
      id: 406,
      level_id: 4,
      orden: 6,
      titulo: 'M13 - S15 - Revolucion Digital',
      descripcion: 'Presentacion Final',
      tipo: 'video',
      duracion_minutos: 20,
      xp_reward: 240,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M13 - S15\n\n## Revolucion Digital\n\nSubtitulo: Presentacion Final.'
    },
    {
      id: 501,
      level_id: 5,
      orden: 1,
      titulo: 'M14 - S16 - Empoderamiento',
      descripcion: 'Cierre & Embajadores',
      tipo: 'video',
      duracion_minutos: 19,
      xp_reward: 220,
      is_free: false,
      video_url: '',
      pdf_url: '',
      contenido_markdown: '# M14 - S16\n\n## Empoderamiento\n\nSubtitulo: Cierre & Embajadores.\n\n- Hito 1: Instalacion\n- Hito 2: Meta-Prompting\n- Hito 3: Deep Research\n- Hito 4: Ritualistica AI-Native\n- Hito 5: Niveles de Uso'
    }
  ],
  progress: [
    {
      id: 1,
      user_id: 'demo-user-1',
      lesson_id: 101,
      completed_at: new Date(now - 1000 * 60 * 60 * 24 * 12).toISOString()
    },
    {
      id: 2,
      user_id: 'demo-user-1',
      lesson_id: 201,
      completed_at: new Date(now - 1000 * 60 * 60 * 24 * 10).toISOString()
    },
    {
      id: 3,
      user_id: 'demo-user-1',
      lesson_id: 301,
      completed_at: new Date(now - 1000 * 60 * 60 * 24 * 8).toISOString()
    },
    {
      id: 4,
      user_id: 'demo-user-1',
      lesson_id: 302,
      completed_at: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString()
    },
    {
      id: 5,
      user_id: 'demo-user-1',
      lesson_id: 303,
      completed_at: new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString()
    },
    {
      id: 6,
      user_id: 'demo-user-1',
      lesson_id: 401,
      completed_at: new Date(now - 1000 * 60 * 60 * 24 * 4).toISOString()
    }
  ],
  comments: [
    {
      id: 1,
      lesson_id: 101,
      user_id: 'demo-user-2',
      content: 'Me gusta que el modulo de entrada ya explicita que hay una version Metodo y otra IA.',
      created_at: new Date(now - 1000 * 60 * 60 * 30).toISOString()
    },
    {
      id: 2,
      lesson_id: 303,
      user_id: 'demo-user-3',
      content: 'Deep Research quedo mucho mas claro con el nuevo nombre visible.',
      created_at: new Date(now - 1000 * 60 * 60 * 18).toISOString()
    },
    {
      id: 3,
      lesson_id: null,
      user_id: 'demo-user-1',
      content: 'Hoy voy a revisar si toda la ruta refleja los nombres exactos de la cartilla.',
      created_at: new Date(now - 1000 * 60 * 60 * 5).toISOString()
    }
  ],
  events: [
    {
      id: 1,
      titulo: 'Sesion en vivo - Brujula MetodologIA',
      descripcion: 'Alineacion de expectativas, estructura y foco de las primeras semanas.',
      fecha_inicio: new Date(now + 1000 * 60 * 60 * 24 * 2).toISOString(),
      url_meeting: ''
    },
    {
      id: 2,
      titulo: 'Workshop - Deep Research aplicado',
      descripcion: 'Practica guiada para investigar, sintetizar y convertir hallazgos en accion.',
      fecha_inicio: new Date(now + 1000 * 60 * 60 * 24 * 5).toISOString(),
      url_meeting: ''
    },
    {
      id: 3,
      titulo: 'Cierre de cohorte - Presentacion final',
      descripcion: 'Espacio para mostrar soluciones reales y activar el camino de embajadores.',
      fecha_inicio: new Date(now + 1000 * 60 * 60 * 24 * 12).toISOString(),
      url_meeting: ''
    }
  ]
};
