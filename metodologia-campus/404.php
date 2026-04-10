<?php get_header(); ?>

<div class="section section-lg">
    <div class="container text-center">
        <div class="text-8xl font-extrabold text-gradient-gold mb-8">404</div>
        <h1 class="text-3xl font-bold mb-4">Página no encontrada</h1>
        <p class="text-secondary mb-8">Lo sentimos, la página que buscas no existe.</p>
        <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="btn btn-primary">Volver al inicio</a>
    </div>
</div>

<?php get_footer(); ?>
