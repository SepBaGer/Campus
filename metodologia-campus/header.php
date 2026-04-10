<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div id="page" class="site">
    <!-- Skip Link -->
    <a class="skip-link sr-only" href="#main">Saltar al contenido</a>

    <!-- Premium Nav (Homologated) -->
    <nav class="premium-nav">
        <div class="nav-container">
            <!-- Logo & Tagline -->
            <div class="flex items-center gap-6">
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="nav-logo-link flex items-center gap-3">
                    <svg width="32" height="32" viewBox="0 0 36 36" fill="none" class="logo-svg">
                         <defs>
                            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#0A122A" />
                                <stop offset="100%" stop-color="#1e293b" />
                            </linearGradient>
                        </defs>
                        <rect width="36" height="36" rx="10" fill="url(#logoGradient)"/>
                        <path d="M10 12h3v12h-3V12zm6 0h3v8h-3v-8zm0 10h3v2h-3v-2zm6-10h3v6h-3v-6zm0 8h3v4h-3v-4z" fill="white"/>
                        <circle cx="18" cy="8" r="2" fill="#FFD700"/>
                    </svg>
                    <h1><span class="highlight-metodologia">Metodolog</span><span class="highlight-ia-premium">IA</span></h1>
                </a>
                
                <!-- Separator & Tagline -->
                <div class="hidden xl:flex items-center gap-4 border-l border-white/10 pl-6 h-8">
                    <span class="text-xs font-bold tracking-widest text-[#FFD700] uppercase">Acelere su Estrategia</span>
                </div>
            </div>

            <!-- Main Navigation (Clean Text Links - No Icons) -->
            <div class="nav-row">
                <a href="<?php echo esc_url( home_url( '/aula' ) ); ?>" class="nav-link-premium <?php echo is_page('aula') ? 'active' : ''; ?>">
                    Aula
                </a>
                <a href="<?php echo esc_url( home_url( '/calendario' ) ); ?>" class="nav-link-premium <?php echo is_page('calendario') ? 'active' : ''; ?>">
                    Calendario
                </a>
                <a href="<?php echo esc_url( home_url( '/comunidad' ) ); ?>" class="nav-link-premium <?php echo is_page('comunidad') ? 'active' : ''; ?>">
                    Comunidad
                </a>
                <a href="<?php echo esc_url( home_url( '/ranking' ) ); ?>" class="nav-link-premium <?php echo is_page('ranking') ? 'active' : ''; ?>">
                    Ranking
                </a>
            </div>

            <!-- Right Actions -->
            <div class="nav-actions">
                <a href="https://metodologia.info/recursos" target="_blank" class="nav-link-secondary">Recursos</a>
                <a href="https://metodologia.info/contacto/index.html" target="_blank" class="nav-link-secondary">Contacto</a>
                
                <?php if ( is_user_logged_in() ) : ?>
                     <a href="<?php echo esc_url( home_url( '/login' ) ); ?>" class="nav-cta-glow">Inicio de Sesión</a>
                <?php else : ?>
                    <a href="<?php echo esc_url( wp_login_url() ); ?>" class="nav-cta-glow">Inicio de Sesión</a>
                <?php endif; ?>
            </div>

            <!-- Mobile Menu Button -->
            <button class="md:hidden mobile-menu-btn p-2 text-slate-300" aria-label="Menu" title="Abrir Menú" onclick="document.getElementById('mobileMenu').classList.toggle('hidden')">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
        </div>
    </nav>
    
    <!-- Mobile Menu Overlay (Hidden by default) -->
    <div id="mobileMenu" class="hidden fixed inset-0 z-40 bg-slate-900/95 backdrop-blur-xl pt-24 px-6">
         <div class="flex flex-col gap-6">
            <a href="<?php echo esc_url( home_url( '/aula' ) ); ?>" class="text-xl font-bold text-white">Aula</a>
            <a href="<?php echo esc_url( home_url( '/calendario' ) ); ?>" class="text-xl font-bold text-white">Calendario</a>
            <a href="<?php echo esc_url( home_url( '/comunidad' ) ); ?>" class="text-xl font-bold text-white">Comunidad</a>
            <a href="<?php echo esc_url( home_url( '/ranking' ) ); ?>" class="text-xl font-bold text-white">Ranking</a>
            <hr class="border-white/10">
            <a href="https://metodologia.info/recursos" class="text-slate-300">Recursos</a>
            <a href="https://metodologia.info/contacto/index.html" class="text-slate-300">Contacto Soporte</a>
            <?php if ( is_user_logged_in() ) : ?>
                 <a href="<?php echo esc_url( home_url( '/profile' ) ); ?>" class="btn-gold w-full justify-center">Mi Perfil</a>
            <?php else : ?>
                <a href="<?php echo esc_url( wp_login_url() ); ?>" class="btn-gold w-full justify-center">Inicia Ahora</a>
            <?php endif; ?>
         </div>
    </div>

    <main id="main" class="site-main">
