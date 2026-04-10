/**
 * MetodologIA v2 - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', function () {
    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const body = document.body;

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function () {
            const isOpen = menuToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active', isOpen);
            body.classList.toggle('menu-open', isOpen);
            menuToggle.setAttribute('aria-expanded', isOpen);
            mobileMenu.setAttribute('aria-hidden', !isOpen);
        });

        // Close on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
                body.classList.remove('menu-open');
            });
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                menuToggle.classList.remove('active');
                mobileMenu.classList.remove('active');
                body.classList.remove('menu-open');
            }
        });
    }

    // Header Scroll Behavior
    const header = document.getElementById('header');
    let lastScrollY = 0;

    if (header) {
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            // Add scrolled class for background
            header.classList.toggle('header--scrolled', currentScrollY > 50);

            // Hide/show on scroll direction
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                header.classList.add('header--hidden');
            } else {
                header.classList.remove('header--hidden');
            }

            lastScrollY = currentScrollY;
        }, { passive: true });
    }

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Animate Elements on Scroll (Intersection Observer)
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                animateOnScroll.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe cards and sections
    document.querySelectorAll('.card, .section header').forEach(el => {
        el.classList.add('animate-target');
        animateOnScroll.observe(el);
    });

    // Progress Bar Animation
    document.querySelectorAll('.progress__bar').forEach(bar => {
        const targetWidth = bar.style.width;
        bar.style.width = '0%';

        const progressObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        bar.style.width = targetWidth;
                    }, 200);
                    progressObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        progressObserver.observe(bar);
    });

    // Initialize Lucide Icons (if available)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('MetodologIA v2 initialized');
});
