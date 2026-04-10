<?php
if ( post_password_required() ) {
    return;
}
?>

<div id="comments" class="comments-area mt-16 pt-16 border-t border-gray-200">

    <?php if ( have_comments() ) : ?>
        <h2 class="comments-title text-2xl font-bold mb-8">
            <?php
            $comments_number = get_comments_number();
            if ( '1' === $comments_number ) {
                printf( esc_html__( '1 comentario', 'metodologia-campus' ) );
            } else {
                printf(
                    esc_html( _nx( '%1$s comentario', '%1$s comentarios', $comments_number, 'comments title', 'metodologia-campus' ) ),
                    number_format_i18n( $comments_number )
                );
            }
            ?>
        </h2>

        <ol class="comment-list space-y-8 mb-12">
            <?php
            wp_list_comments( array(
                'style'       => 'ol',
                'short_ping'  => true,
                'avatar_size' => 48,
                'callback'    => function($comment, $args, $depth) {
                    $GLOBALS['comment'] = $comment;
                    ?>
                    <li <?php comment_class('comment-item'); ?> id="li-comment-<?php comment_ID(); ?>">
                        <div id="comment-<?php comment_ID(); ?>" class="comment-body bg-gray-50 p-6 rounded-2xl">
                            <div class="comment-author vcard flex items-center mb-4">
                                <?php if ( 0 != $args['avatar_size'] ) echo get_avatar( $comment, $args['avatar_size'], '', '', array('class' => 'rounded-full mr-4') ); ?>
                                <div>
                                    <div class="font-bold"><?php echo get_comment_author_link(); ?></div>
                                    <div class="text-sm text-secondary">
                                        <a href="<?php echo esc_url( get_comment_link( $comment->comment_ID ) ); ?>">
                                            <time datetime="<?php comment_time( 'c' ); ?>">
                                                <?php printf( __( '%1$s at %2$s', 'metodologia-campus' ), get_comment_date(), get_comment_time() ); ?>
                                            </time>
                                        </a>
                                        <?php edit_comment_link( __( '(Edit)', 'metodologia-campus' ), ' <span class="edit-link ml-2">', '</span>' ); ?>
                                    </div>
                                </div>
                            </div>

                            <?php if ( '0' == $comment->comment_approved ) : ?>
                                <em class="comment-awaiting-moderation block mb-4 text-yellow-600"><?php _e( 'Your comment is awaiting moderation.', 'metodologia-campus' ); ?></em>
                            <?php endif; ?>

                            <div class="comment-content prose max-w-none">
                                <?php comment_text(); ?>
                            </div>

                            <div class="reply mt-4">
                                <?php comment_reply_link( array_merge( $args, array( 
                                    'depth' => $depth, 
                                    'max_depth' => $args['max_depth'],
                                    'class' => 'btn btn-sm btn-secondary text-sm'
                                ) ) ); ?>
                            </div>
                        </div>
                    <!-- </li> is added by WordPress automatically -->
                    <?php
                }
            ) );
            ?>
        </ol>

        <?php
        the_comments_navigation( array(
            'prev_text' => '<span class="nav-previous">' . __( 'Comentarios anteriores', 'metodologia-campus' ) . '</span>',
            'next_text' => '<span class="nav-next">' . __( 'Comentarios siguientes', 'metodologia-campus' ) . '</span>',
            'screen_reader_text' => __( 'Navegación de comentarios', 'metodologia-campus' ),
            'class' => 'comments-navigation flex justify-between mb-12',
        ) );
        ?>

    <?php endif; // Check for have_comments(). ?>

    <?php if ( ! comments_open() && get_comments_number() && post_type_supports( get_post_type(), 'comments' ) ) : ?>
        <p class="no-comments p-4 rounded-lg text-center" style="background-color: var(--color-warning-subtle); color: var(--color-warning);"><?php _e( 'Los comentarios están cerrados.', 'metodologia-campus' ); ?></p>
    <?php endif; ?>

    <?php
    $commenter = wp_get_current_commenter();
    $req = get_option( 'require_name_email' );
    $aria_req = ( $req ? " aria-required='true'" : '' );

    comment_form( array(
        'class_form' => 'comment-form p-8 rounded-2xl shadow-sm border',
        // Injected styles to override default WordPress/Tailwind clashes
        'class_container' => 'comment-respond mt-12',
        'title_reply' => '<span class="text-2xl font-bold" style="color: var(--color-text-primary);">' . __( 'Deja un comentario', 'metodologia-campus' ) . '</span>',
        'title_reply_to' => __( 'Deja un comentario a %s', 'metodologia-campus' ),
        'cancel_reply_link' => __( 'Cancelar respuesta', 'metodologia-campus' ),
        'label_submit' => __( 'Publicar comentario', 'metodologia-campus' ),
        'class_submit' => 'btn w-full md:w-auto cursor-pointer', 
        'submit_button' => '<button name="%1$s" type="submit" id="%2$s" class="%3$s" style="background-color: var(--color-brand-gold); color: var(--color-text-inverse); font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 9999px;">%4$s</button>',
        'submit_field' => '<div class="form-submit mt-6">%1$s %2$s</div>',
        'comment_field' => '<div class="comment-form-comment mb-6"><label for="comment" class="block mb-2 font-medium" style="color: var(--color-text-secondary);">' . _x( 'Comentario', 'noun', 'metodologia-campus' ) . '</label><textarea id="comment" name="comment" cols="45" rows="8" aria-required="true" class="w-full form-input rounded-xl focus:ring transition-all" style="background-color: var(--color-bg-raised); border: 1px solid var(--color-border-default); color: var(--color-text-primary);"></textarea></div>',
    ) );
    ?>

</div>
