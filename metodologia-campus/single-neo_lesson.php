<?php get_header(); ?>

<div class="section">
    <div class="container container-lg">
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
                    <?php 
                    // content injection handles navigation and comments via metodologia-core plugin
                    the_content(); 
                    ?>
                </div>

            </article>
        <?php endwhile; ?>
    </div>
</div>

<?php get_footer(); ?>
