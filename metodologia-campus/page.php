<?php get_header(); ?>

<div class="section">
    <div class="container">
        <?php while ( have_posts() ) : the_post(); ?>
            <article class="page-content">
                <header class="mb-8 text-center">
                    <h1 class="text-4xl font-bold"><?php the_title(); ?></h1>
                </header>
                
                <div class="lesson-content">
                    <?php the_content(); ?>
                </div>
            </article>
        <?php endwhile; ?>
    </div>
</div>

<?php get_footer(); ?>
