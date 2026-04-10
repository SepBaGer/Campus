<?php
/**
 * MetodologIA v2 Theme Functions
 * Simplified version without external dependencies
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Theme setup
function metodologia_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption' ) );
    add_theme_support( 'custom-logo' );
    
    register_nav_menus( array(
        'primary' => 'Menu Principal',
        'footer'  => 'Menu Footer',
    ) );
}
add_action( 'after_setup_theme', 'metodologia_setup' );

// Enqueue styles and scripts
function metodologia_scripts() {
    $theme_uri = get_template_directory_uri();
    $theme_version = '4.24.2'; // Universal Layout Expansion + Comments Fix
    
    // Google Fonts
    wp_enqueue_style( 
        'metodologia-fonts', 
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600&display=swap',
        array(),
        null
    );
    
    // Design System (Base Layout)
    wp_enqueue_style( 
        'metodologia-system', 
        $theme_uri . '/css/metodologia-system.css',
        array( 'metodologia-fonts' ),
        $theme_version
    );

    // Premium Styles (Visual Overrides)
    wp_enqueue_style( 
        'metodologia-premium', 
        $theme_uri . '/css/metodologia-premium.css',
        array( 'metodologia-system' ), // Load after system
        $theme_version
    );
    
    // Theme style.css
    wp_enqueue_style( 
        'metodologia-style', 
        get_stylesheet_uri(),
        array( 'metodologia-system' ),
        $theme_version
    );
    
    // Main JavaScript
    wp_enqueue_script(
        'metodologia-main',
        $theme_uri . '/js/main.js',
        array(),
        $theme_version,
        true
    );
}
add_action( 'wp_enqueue_scripts', 'metodologia_scripts' );

// Add body class
function metodologia_body_class( $classes ) {
    $classes[] = 'metodologia-campus';
    return $classes;
}
add_filter( 'body_class', 'metodologia_body_class' );

// Register widget areas
function metodologia_widgets() {
    register_sidebar( array(
        'name'          => 'Sidebar',
        'id'            => 'sidebar-1',
        'before_widget' => '<div class="widget">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ) );
}
add_action( 'widgets_init', 'metodologia_widgets' );

// Force comment support for LMS lessons (MasterStudy)
function metodologia_enable_lesson_comments() {
    add_post_type_support( 'neo_lesson', 'comments' );
}
add_action( 'init', 'metodologia_enable_lesson_comments', 99 );

// Force comments OPEN for neo_lesson (overrides DB status)
add_filter( 'comments_open', function( $open, $post_id ) {
    $post = get_post( $post_id );
    if ( $post && 'neo_lesson' === $post->post_type ) {
        return true;
    }
    return $open;
}, 10, 2 );
