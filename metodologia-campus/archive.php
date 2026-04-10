<?php get_header(); ?>

<div class="section">
    <div class="container">
        <header class="mb-12 text-center">
            <?php the_archive_title( '<h1 class="text-4xl font-bold mb-4">', '</h1>' ); ?>
            <?php the_archive_description( '<p class="text-secondary">', '</p>' ); ?>
        </header>

        <?php if ( have_posts() ) : ?>
            <div class="grid md-grid-cols-2 lg-grid-cols-3 gap-6">
                <?php while ( have_posts() ) : the_post(); ?>
                    <article class="card card-glass">
                        <?php if ( has_post_thumbnail() ) : ?>
                            <div class="card-thumbnail mb-4">
                                <?php the_post_thumbnail( 'medium' ); ?>
                            </div>
                        <?php endif; ?>
                        
                        <div class="card-header">
                            <h2 class="card-title">
                                <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                            </h2>
                            <span class="card-subtitle"><?php echo get_the_date(); ?></span>
                        </div>
                        
                        <div class="card-body">
                            <?php the_excerpt(); ?>
                        </div>
                        
                        <div class="card-footer">
                            <a href="<?php the_permalink(); ?>" class="btn btn-secondary btn-sm">Leer más</a>
                        </div>
                    </article>
                <?php endwhile; ?>
            </div>
            
            <?php the_posts_pagination(); ?>
        <?php else : ?>
            <p class="text-center text-secondary">No se encontraron publicaciones.</p>
        <?php endif; ?>
    </div>
</div>

<?php get_footer(); ?>
