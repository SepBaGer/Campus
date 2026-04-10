<?php
/**
 * The template for displaying the footer
 *
 * Contains the closing of the #content div and all content after.
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package Metodologia_Campus
 */
?>

	</main><!-- #main -->

    <!-- FOOTER (Homologated Premium) -->
    <footer class="bg-gradient-to-b from-slate-900 to-[#020617] border-t border-white/5 mt-0 relative overflow-hidden">
        <!-- Background Decorations -->
        <div class="footer-glow-line"></div>
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-gold/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div class="container mx-auto px-6 pt-20 pb-12 relative z-10">
            
            <!-- Links Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
                
                <!-- Brand Column (2 cols) -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="flex flex-col gap-4">
                        <!-- Logo Homologated -->
                        <div class="flex items-center gap-3">
                            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" class="logo-svg">
                                <defs>
                                    <linearGradient id="footerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#0A122A" />
                                        <stop offset="100%" stop-color="#1e293b" />
                                    </linearGradient>
                                </defs>
                                <rect width="36" height="36" rx="10" fill="url(#footerLogoGrad)"/>
                                <path d="M10 12h3v12h-3V12zm6 0h3v8h-3v-8zm0 10h3v2h-3v-2zm6-10h3v6h-3v-6zm0 8h3v4h-3v-4z" fill="white"/>
                                <circle cx="18" cy="8" r="2" fill="#FFD700"/>
                            </svg>
                            <h3 class="text-2xl"><span class="highlight-metodologia">Metodolog</span><span class="highlight-ia-premium">IA</span></h3>
                        </div>
                        <p class="text-[#FFD700] text-xs font-bold tracking-[0.2em] uppercase pl-1">ACELERE SU ESTRATEGIA</p>
                    </div>
                    <p class="text-slate-400 text-sm leading-relaxed max-w-sm">
                        Metodologías de alto rendimiento potenciadas con inteligencia artificial para la (r)evolución personal y profesional.
                    </p>
                </div>

                <!-- Servicios -->
                <div class="space-y-4">
                    <h4 class="text-white font-bold text-xs uppercase tracking-widest footer-section-title">Servicios</h4>
                    <ul class="space-y-3">
                        <li><a href="<?php echo esc_url( home_url( '/empresas' ) ); ?>" class="footer-link text-sm">Empresas</a></li>
                        <!-- Highlighted Item 'Personas' -->
                        <li><a href="<?php echo esc_url( home_url( '/personas' ) ); ?>" class="footer-link text-sm text-[#FFD700] font-bold">› Personas</a></li>
                        <li><a href="<?php echo esc_url( home_url( '/offering' ) ); ?>" class="footer-link text-sm">Offering</a></li>
                        <li><a href="https://metodologia.info/recursos" class="footer-link text-sm">Recursos</a></li>
                    </ul>
                </div>

                <!-- Empresa -->
                <div class="space-y-4">
                    <h4 class="text-white font-bold text-xs uppercase tracking-widest footer-section-title">Empresa</h4>
                    <ul class="space-y-3">
                        <li><a href="<?php echo esc_url( home_url( '/mision' ) ); ?>" class="footer-link text-sm">Misión</a></li>
                        <li><a href="<?php echo esc_url( home_url( '/nosotros' ) ); ?>" class="footer-link text-sm">Nosotros</a></li>
                        <li><a href="https://metodologia.info/contacto" class="footer-link text-sm">Contacto</a></li>
                    </ul>
                </div>

                <!-- Legal -->
                <div class="space-y-4">
                    <h4 class="text-white font-bold text-xs uppercase tracking-widest footer-section-title">Legal</h4>
                    <ul class="space-y-3">
                        <li><a href="<?php echo esc_url( home_url( '/terminos' ) ); ?>" class="footer-link text-sm">Términos y Condiciones</a></li>
                        <li><a href="<?php echo esc_url( home_url( '/privacidad' ) ); ?>" class="footer-link text-sm">Política de Privacidad</a></li>
                    </ul>
                </div>
            </div>

            <!-- Bottom Bar -->
            <div class="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <p class="text-xs text-slate-500">
                    © 2026 <span class="text-slate-300">MetodologIA</span>. <span class="text-slate-500">Copyleft — Licencia MIT.</span>
                </p>
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <p class="text-xs text-slate-400">Success as a Service <span class="mx-1 text-slate-600">|</span> Powered by <span class="text-slate-300">Pristino Agent</span></p>
                </div>
            </div>
        </div>
    </footer>
</div>

<?php wp_footer(); ?>
</body>
</html>
