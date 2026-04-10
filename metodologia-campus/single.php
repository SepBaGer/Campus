<?php get_header(); ?>

<div class="section">
    <div class="container">
        <?php while ( have_posts() ) : the_post(); ?>
            <article class="post-content">
                <header class="mb-8">
                    <h1 class="text-4xl font-bold mb-4"><?php the_title(); ?></h1>
                    <div class="text-secondary text-sm">
                        <span><?php echo get_the_date(); ?></span>
                        <span> · </span>
                        <span><?php the_author(); ?></span>
                    </div>
                </header>
                
                <?php if ( has_post_thumbnail() ) : ?>
                    <div class="mb-8">
                        <?php the_post_thumbnail( 'large', array( 'class' => 'w-full rounded-2xl' ) ); ?>
                    </div>
                <?php endif; ?>
                
                <div class="lesson-content">
                    <?php the_content(); ?>
                </div>
                
                <nav class="lesson-nav mt-12">
                    <?php
                    $prev = get_previous_post();
                    $next = get_next_post();
                    ?>
                    <?php if ( $prev ) : ?>
                        <a href="<?php echo get_permalink( $prev ); ?>" class="btn btn-secondary">
                            ← <?php echo esc_html( $prev->post_title ); ?>
                        </a>
                    <?php endif; ?>
                    <?php if ( $next ) : ?>
                        <a href="<?php echo get_permalink( $next ); ?>" class="btn btn-secondary">
                            <?php echo esc_html( $next->post_title ); ?> →
                        </a>
                    <?php endif; ?>
                </nav>

                <?php if ( comments_open() || get_comments_number() ) : ?>
                <div class="post-comments mt-12">
                    <?php comments_template(); ?>
                </div>
                <?php endif; ?>

            </article>
        <?php endwhile; ?>
    </div>
</div>

<?php get_footer(); ?>
