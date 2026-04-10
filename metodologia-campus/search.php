<?php get_header(); ?>

<div class="section">
    <div class="container">
        <header class="mb-12 text-center">
            <h1 class="text-4xl font-bold mb-4">
                Resultados para: <span class="text-gradient-gold"><?php echo get_search_query(); ?></span>
            </h1>
        </header>

        <?php if ( have_posts() ) : ?>
            <div class="grid md-grid-cols-2 gap-6">
                <?php while ( have_posts() ) : the_post(); ?>
                    <article class="card card-solid">
                        <div class="card-header">
                            <h2 class="card-title">
                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                            </h2>
                        </div>
                        <div class="card-body">
                            <?php the_excerpt(); ?>
                        </div>
                        <div class="card-footer">
                            <a href="<?php the_permalink(); ?>" class="btn btn-secondary btn-sm">Ver</a>
                        </div>
                    </article>
                <?php endwhile; ?>
            </div>
            
            <?php the_posts_pagination(); ?>
        <?php else : ?>
            <div class="text-center">
                <p class="text-secondary mb-8">No se encontraron resultados.</p>
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn btn-primary">Volver al inicio</a>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php get_footer(); ?>
