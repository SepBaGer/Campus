<?php get_header(); ?>

<?php if ( is_front_page() || is_home() ) : ?>
<!-- Hero Section -->
<section class="hero">
    <div class="hero__bg"></div>
    <div class="hero__wrapper">
        <div class="hero__content">
            <span class="badge badge-gold mb-6">
                <span class="badge__dot"></span>
                Edición 2026
            </span>
            
            <h1 class="hero__title">
                Ruta de<br>
                <span class="text-gold">(R)</span>Evolución Digital
            </h1>
            
            <p class="hero__subtitle">
                Evoluciona con método,<br>
                revoluciona con tecnología.
            </p>
            
            <div class="hero__actions">
                <a href="https://campus.metodologia.info/cursos/programa-de-empoderamiento/" class="btn btn-primary btn-xl">
                    Explorar Programas
                    <svg class="w-6 h-6 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                </a>
            </div>
        </div>
        
        <!-- Golden Orb (Heritage from metodologia.info) -->
        <div class="golden-orb hero__orb">
            <div class="golden-orb__glow"></div>
            <div class="golden-orb__ring-outer"></div>
            <div class="golden-orb__ring-inner"></div>
            <div class="golden-orb__core"></div>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Levels/Courses Section Removed as per request -->

<?php get_footer(); ?>
