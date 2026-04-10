Feature: Campus MetodologIA v2 Replatforming
  Como estudiante y/o administrador del Campus
  Quiero un Campus de alto rendimiento basado en Vite y Supabase
  Para estudiar de forma eficiente, persistir progreso y acceder a mis cursos

  Background:
    Given el usuario ha aterrizado en la ruta "/campus/" de metodologia.info
    And el cliente Supabase está inicializado

  @FR-01 @SC-01 @UI @Auth
  Scenario: Módulo de Registro y Autenticación Unificada
    Given el usuario no tiene una sesión activa
    When el usuario navega a "#/login"
    And completa el formulario de autenticación con email y contraseña válidos
    Then la API de Supabase devuelve un JWT válido
    And el token se almacena en el localStorage
    And el usuario es redirigido a "#/dashboard"

  @FR-02 @SC-02 @Data
  Scenario: Visualización de Ruta y Niveles
    Given el usuario está autenticado y en la ruta "#/dashboard"
    When el componente Dashboard solicita los niveles
    Then el endpoint GET "/rest/v1/levels" debe responder con 10 niveles
    And la UI debe renderizar la ruta de avance incluyendo el progreso porcentual y XP del usuario

  @FR-03 @FR-11 @SC-03 @SC-11 @Security
  Scenario Outline: Seguridad de RLS para el acceso a lecciones
    Given un usuario con status de membresia "<membership>"
    And su nivel desbloqueado actual es <current_level>
    When el usuario solicita la lección del nivel <lesson_level>
    Then el servidor debe devolver <status_code>

    Examples:
      | membership | current_level | lesson_level | status_code |
      | active     | 3             | 2            | 200         |
      | active     | 3             | 4            | 403         |
      | inactive   | 3             | 2            | 403         |

  @FR-04 @SC-04 @EdgeFunction
  Scenario: Persistencia y Registro de Progreso (Level Up)
    Given el usuario está completando una lección del nivel 1
    When el usuario hace click en "Completar Lección"
    Then el frontend invoca a la Edge Function "complete-lesson" con el ID de la lección
    And la Edge Function inserta el progreso en la tabla "progress" y ajusta el XP
    And si el XP supera "xp_required", "current_level" en el perfil se incrementa

  @FR-05 @SC-05 @UI
  Scenario: Navegación Prev/Next en Lecciones
    Given el usuario está en la vista "#/aula/5" (Lección 5)
    And la lección 4 y la lección 6 pertenecen a su nivel
    When el usuario visualiza los controles al final de la clase
    Then los botones "Anterior" y "Siguiente" están habilitados
    And hacer click en "Siguiente" actualiza el hash router a "#/aula/6" sin recargar la página

  @FR-06 @SC-06 @Query
  Scenario: Visualización de Ranking (Top 50)
    Given el usuario navega a "#/ranking"
    When la vista Ranking inicializa
    Then solicita la tabla "profiles" ordenada por "total_xp" descendente con límite 50
    And el usuario puede ver su propia posición resaltada en el leaderboard

  @FR-07 @SC-07 @Query
  Scenario: Calendario de Eventos
    Given el usuario navega a "#/calendario"
    When solicita los eventos a partir de la fecha actual
    Then la tabla "events" devuelve un array JSON procesable
    And la UI renderiza las sesiones futuras

  @FR-08 @SC-08 @Integration
  Scenario: Acceso a la Comunidad Externa
    Given el usuario navega a "#/comunidad"
    When la vista Comunidad inicializa
    Then el sistema muestra un punto de entrada (link o embed) para la plataforma externa
    And el acceso es libre para usuarios registrados [Principio I]

  @FR-09 @SC-09 @Data
  Scenario: Historial en Perfil y Progreso Acumulado
    Given el usuario navega a "#/perfil"
    When solicita sus propios datos desde "profiles"
    Then el sistema le devuelve su información completa (displayName, current_level, total_xp)
    And la UI muestra el historial de lecciones completadas desde la tabla "progress"

  @FR-10 @SC-10 @Editorial
  Scenario: Edición Editorial Sin Deploy Code
    Given un administrador edita el campo "contenido_markdown" de una lección en la DB
    When el estudiante recarga la vista de la lección
    Then el nuevo contenido markdown es parseado y renderizado inmediatamente sin necesitar un proceso de build de Vite

  @FR-12 @SC-12 @Performance
  Scenario: Hero de Home con CTA y Alto Rendimiento
    Given el usuario llega a "#/" (Guest Landing)
    When el componente Landing carga
    Then el LCP se registra en menos de 2.5s
    And el botón "Empezar Ahora" redirige correctamente a "#/login"

  @FR-13 @SC-13 @Social
  Scenario: Sistema de Comentarios en Lecciones
    Given el usuario está en una lección desbloqueada
    When el usuario escribe un comentario y presiona enviar
    Then el frontend realiza un POST a la tabla "comments" con lesson_id y user_id
    And el comentario se visualiza en orden cronológico ascendente debajo de la lección

  @FR-14 @SC-14 @Trigger
  Scenario: Disparo de Email de Bienvenida Post-Registro
    Given un nuevo usuario se registra vía Supabase Auth
    When la transacción de registro es exitosa
    Then el trigger de base de datos invoca la Edge Function "send-welcome"
    And se solicita el envío del email a través de la API externa (Resend/SendGrid)
