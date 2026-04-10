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
                <a href="<?php echo esc_url( home_url( '/la-ruta' ) ); ?>" class="btn btn-primary btn-lg">
                    Explorar la Ruta
                    <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                </a>
                <a href="<?php echo esc_url( home_url( '/contacto' ) ); ?>" class="btn btn-ghost btn-lg">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    Agendar Conversación
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

<!-- Levels/Courses Section -->
<section class="section section-lg" style="background: linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg-primary) 100%);">
    <div class="container">
        <?php if ( is_front_page() || is_home() ) : ?>
        <header class="text-center mb-16">
            <span class="badge badge-outline mb-4">10 Niveles de Maestría</span>
            <h2 class="text-4xl md-text-5xl font-bold mb-4">
                Tu Ruta hacia la <span class="text-gradient-gold">Excelencia</span>
            </h2>
            <p class="text-secondary text-lg max-w-2xl mx-auto">
                Cada nivel te acerca más a dominar la inteligencia artificial aplicada a tu negocio.
            </p>
        </header>
        <?php endif; ?>

        <?php if ( have_posts() ) : ?>
            <div class="grid md-grid-cols-2 lg-grid-cols-3 gap-6">
                <?php 
                $level_index = 0;
                while ( have_posts() ) : the_post(); 
                    $level_color = $level_index % 10;
                ?>
                    <article class="card card-glass card-level-<?php echo $level_color; ?>">
                        <?php if ( has_post_thumbnail() ) : ?>
                            <div class="card-thumbnail">
                                <?php the_post_thumbnail( 'medium', array( 'class' => 'card-thumbnail__img' ) ); ?>
                            </div>
                        <?php endif; ?>
                        
                        <div class="card-header">
                            <span class="card-level-badge level-<?php echo $level_color; ?>">
                                Nivel <?php echo $level_color; ?>
                            </span>
                            <h3 class="card-title">
                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                            </h3>
                            <p class="card-subtitle"><?php echo wp_trim_words( get_the_excerpt(), 15 ); ?></p>
                        </div>
                        
                        <div class="card-footer">
                            <a href="<?php the_permalink(); ?>" class="btn btn-secondary btn-sm btn-block">
                                Explorar
                                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            </a>
                        </div>
                    </article>
                <?php 
                    $level_index++;
                endwhile; 
                ?>
            </div>
            
            <div class="mt-12">
                <?php the_posts_pagination( array(
                    'prev_text' => '← Anterior',
                    'next_text' => 'Siguiente →',
                    'class'     => 'pagination-styled',
                ) ); ?>
            </div>
            
        <?php else : ?>
            <div class="text-center py-16">
                <div class="text-6xl mb-6">🚀</div>
                <h2 class="text-3xl font-bold mb-4">Bienvenido al Campus</h2>
                <p class="text-secondary mb-8">Tu viaje hacia la (R)Evolución Digital comienza aquí.</p>
                <a href="<?php echo esc_url( home_url( '/la-ruta' ) ); ?>" class="btn btn-primary btn-lg">
                    Explorar la Ruta
                </a>
            </div>
        <?php endif; ?>
    </div>
</section>

<?php get_footer(); ?>
