document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initialize Lenis
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
        smooth: true,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0, 0);

    // 2. Load Content
    try {
        const response = await fetch('/api/content');
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        
        populateDOM(data);
        setTimeout(initAnimations, 100);
    } catch (err) {
        console.error("Error loading content:", err);
    }

    function populateDOM(data) {
        // Logo images
        const logoUrl = data.logo || '/images/placeholder.jpg';
        document.querySelectorAll('.main-logo-img').forEach(el => el.src = logoUrl);

        // Hero background color (admin-controlled)
        const heroBgEl = document.querySelector('.hero-bg');
        if(data.heroBgColor) {
            document.querySelector('.hero').style.backgroundColor = data.heroBgColor;
        }
        // Hero background image
        const heroOverlay = document.querySelector('.hero-overlay');
        if(data.heroBg && heroBgEl) {
            heroBgEl.style.backgroundImage = `url('${data.heroBg}')`;
            heroBgEl.style.opacity = 1;
            if(heroOverlay) heroOverlay.style.display = 'block';
        } else {
            if(heroOverlay) heroOverlay.style.display = 'none'; // Se for cor sólida, tira o overlay escuro
        }
        const taglineEl = document.querySelector('.hero-tagline');
        if(taglineEl) taglineEl.textContent = data.tagline || '';
        
        // Logo size custom variables
        if (data.heroLogoSizeDesktop) {
            document.documentElement.style.setProperty('--hero-logo-size-desktop', data.heroLogoSizeDesktop);
        } else {
            document.documentElement.style.setProperty('--hero-logo-size-desktop', '12vw');
        }
        if (data.heroLogoSizeMobile) {
            document.documentElement.style.setProperty('--hero-logo-size-mobile', data.heroLogoSizeMobile);
        } else {
            document.documentElement.style.setProperty('--hero-logo-size-mobile', '25vw');
        }

        // Manifesto — SAFE split (no crash if "não" missing)
        if(data.manifesto && data.manifesto.headline) {
            const headline = data.manifesto.headline;
            const parts = headline.split('não');
            if(parts.length >= 2) {
                document.querySelector('.m-part1').textContent = parts[0] + 'não';
                document.querySelector('.m-part2').textContent = parts[1].trim();
            } else {
                document.querySelector('.m-part1').textContent = headline;
                document.querySelector('.m-part2').textContent = '';
            }
        }
        const mBody = document.querySelector('.m-body');
        if(mBody && data.manifesto) mBody.textContent = data.manifesto.body || '';

        // Ambientes (Horizontal Scroll) — respei­ta sectionOrder dinâmico
        const ambContainer = document.getElementById('ambientes-container');
        const sectionOrder = data.sectionOrder || (data.sections ? Object.keys(data.sections) : []);

        sectionOrder.forEach(secName => {
            const secData = data.sections ? data.sections[secName] : null;
            if(!secData) return;

            const html = `
                <section class="section ambiente-pin-wrap" id="sec-${secName}">
                    <div class="ambiente-entry">
                        <h2 class="ambiente-word">${secData.label || secName}</h2>
                    </div>
                    <div class="swipe-icon-container">
                        <span class="swipe-text">Deslize</span>
                        <svg class="swipe-hand" viewBox="0 0 24 24"><path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.21 0-.62-.35-1.18-.91-1.42z"/></svg>
                    </div>
                    <div class="ambiente-track">
                        ${secData.images && secData.images.length > 0
                            ? secData.images.map(img => {
                                const imgSrc = typeof img === 'string' ? img : img.src;
                                const imgCap = typeof img === 'object' && img.caption ? img.caption : '';
                                const imgPos = typeof img === 'object' && img.position ? img.position : 'center center';
                                return `
                                <div class="gallery-item">
                                    <img src="${imgSrc}" alt="${secData.label || secName} - Noce Mobili" loading="lazy"
                                        style="object-position: ${imgPos};" width="1920" height="1080">
                                    ${imgCap ? `<div class="micro-caption">${imgCap}</div>` : ''}
                                    <div class="gallery-sweep-line"></div>
                                </div>
                                `;
                            }).join('')
                            : `<div class="gallery-item"><div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--noce-white);">Fotos em Breve</div></div>`
                        }
                    </div>
                </section>
            `;
            ambContainer.insertAdjacentHTML('beforeend', html);
        });

        // Acabamentos
        if(data.acabamentos && data.acabamentos.items) {
            const wrapper = document.querySelector('.acabamentos-wrapper');
            data.acabamentos.items.forEach((item, i) => {
                const left = 5 + Math.random() * 80;
                const top = 10 + Math.random() * 150;
                const bg = item.image ? `url(${item.image})` : '#333';
                
                const swatchHTML = `
                    <div class="swatch" style="left: ${left}%; top: ${top}%; background: ${bg}; background-size: cover; background-position: center;" data-speed="${0.5 + Math.random() * 1.5}">
                        <div class="name">${item.name}</div>
                    </div>
                `;
                wrapper.insertAdjacentHTML('beforeend', swatchHTML);
            });
        }

        // Parceiros
        if(data.parceiros && data.parceiros.items) {
            const spot = document.querySelector('.parceiros-spotlight');
            data.parceiros.items.forEach(p => {
                const img = p.image || '/images/placeholder.jpg';
                spot.insertAdjacentHTML('beforeend', `<img src="${img}" class="parc-logo" alt="Parceiro ${p.name}" loading="lazy">`);
            });
        }

        // CTA — safe access
        const cta = data.cta || {};
        const ctaHeadline = document.querySelector('.cta-headline');
        if(ctaHeadline) ctaHeadline.textContent = cta.headline || 'Vamos criar o seu ambiente?';
        
        const whatsNum = cta.whatsapp || '5511965665065';
        
        // Update ALL WhatsApp links (floating + footer button)
        const whatsFloat = document.getElementById('whatsapp-float');
        if(whatsFloat) whatsFloat.href = `https://wa.me/${whatsNum}`;
        
        const btnWhats = document.getElementById('btn-whats');
        if(btnWhats) btnWhats.href = `https://wa.me/${whatsNum}`;
        
        // CTA intermediário
        const ctaMidBtn = document.getElementById('btn-cta-mid');
        if(ctaMidBtn) ctaMidBtn.href = `https://wa.me/${whatsNum}`;
        
        const btnInsta = document.getElementById('btn-insta');
        if(btnInsta) btnInsta.href = `https://instagram.com/${cta.instagram || 'nocemobili'}`;
    }

    function initAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        // 1. Hero Animation
        const tlHero = gsap.timeline();
        tlHero.to('.hero-bg', { opacity: 1, duration: 2, ease: "power2.inOut" })
              .from('.main-logo-img', { opacity: 0, scale: 0.9, duration: 1.5, ease: "power3.out" }, "-=1")
              .from('.hero-tagline', { opacity: 0, y: 20, duration: 1 }, "-=0.5");
        
        // Ken burns effect
        if (document.querySelector('.hero-bg').style.backgroundImage !== 'none' && document.querySelector('.hero-bg').style.backgroundImage !== '') {
            gsap.to('.hero-bg', {
                scale: 1.05, duration: 20, repeat: -1, yoyo: true, ease: "none"
            });
        }

        // 2. Manifesto
        const tlManifesto = gsap.timeline({
            scrollTrigger: {
                trigger: '.manifesto',
                start: "top 60%",
            }
        });
        tlManifesto.from('.m-part1', { x: -100, opacity: 0, duration: 1, ease: "power3.out" })
                   .from('.m-part2', { x: 100, opacity: 0, duration: 1, ease: "power3.out" }, "-=1")
                   .from('.m-body', { y: 30, opacity: 0, duration: 1 }, "-=0.5");

        // 2.5. CTA Mid Animation
        const ctaMid = document.querySelector('.cta-mid');
        if(ctaMid) {
            gsap.from('.cta-mid-inner', {
                scrollTrigger: {
                    trigger: '.cta-mid',
                    start: "top 70%",
                },
                y: 30, opacity: 0, duration: 1, ease: "power3.out"
            });
        }

        // 3. Ambientes (Horizontal Scroll & Pin)
        const ambientes = document.querySelectorAll('.ambiente-pin-wrap');
        
        let mm = gsap.matchMedia();

        ambientes.forEach(section => {
            const track = section.querySelector('.ambiente-track');
            const entryWord = section.querySelector('.ambiente-word');
            const swipeIcon = section.querySelector('.swipe-icon-container');
            const images = section.querySelectorAll('.gallery-item img');
            
            mm.add("(min-width: 769px)", () => {
                const wipeTl = gsap.timeline({
                    scrollTrigger: {
                        trigger: section,
                        start: "top top",
                        end: "+=300%",
                        pin: true,
                        scrub: 1,
                        onEnter: () => swipeIcon.classList.add('visible'),
                        onLeave: () => swipeIcon.classList.remove('visible'),
                        onEnterBack: () => swipeIcon.classList.add('visible'),
                        onLeaveBack: () => swipeIcon.classList.remove('visible')
                    }
                });

                wipeTl.to(entryWord, { scale: 0.5, opacity: 0, duration: 1 })
                      .to(track, {
                          x: () => -(track.scrollWidth - window.innerWidth) + "px",
                          ease: "none",
                          duration: 4
                      }, "<"); 

                images.forEach((img, i) => {
                    wipeTl.fromTo(img, 
                        { scale: 1.3, transformOrigin: "left center" }, 
                        { scale: 1, ease: "none", duration: 4 }, 
                        "<0.2"
                    );
                });
            });

            mm.add("(max-width: 768px)", () => {
                ScrollTrigger.create({
                    trigger: section,
                    start: "top 50%",
                    end: "bottom 50%",
                    onEnter: () => swipeIcon.classList.add('visible'),
                    onLeave: () => swipeIcon.classList.remove('visible'),
                    onEnterBack: () => swipeIcon.classList.add('visible'),
                    onLeaveBack: () => swipeIcon.classList.remove('visible')
                });

                gsap.to(entryWord, {
                    scrollTrigger: {
                        trigger: section,
                        start: "top center",
                        end: "top top",
                        scrub: true
                    },
                    scale: 0.8,
                    opacity: 0.1
                });
            });
        });

        // 4. Acabamentos (Zero Gravity Parallax)
        const swatches = document.querySelectorAll('.swatch');
        swatches.forEach(swatch => {
            const speed = swatch.getAttribute('data-speed');
            gsap.to(swatch, {
                y: () => -100 * speed + "vh",
                ease: "none",
                scrollTrigger: {
                    trigger: '.acabamentos-sec',
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.5
                }
            });
        });

        // 5. Parceiros (Spotlight)
        const logos = document.querySelectorAll('.parc-logo');
        logos.forEach(logo => {
            ScrollTrigger.create({
                trigger: logo,
                start: "top 60%",
                end: "bottom 40%",
                toggleClass: "active"
            });
        });

        // 6. Processo Steps Animation (Sequential Reveal)
        const steps = document.querySelectorAll('.step');
        steps.forEach((step, i) => {
            gsap.from(step, {
                scrollTrigger: {
                    trigger: '.proc-steps',
                    start: "top 70%",
                },
                y: 40,
                opacity: 0,
                duration: 0.8,
                delay: i * 0.2,
                ease: "power3.out"
            });
        });

        // 7. FAQ Animation
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach((item, i) => {
            gsap.from(item, {
                scrollTrigger: {
                    trigger: '.faq-list',
                    start: "top 70%",
                },
                y: 30,
                opacity: 0,
                duration: 0.6,
                delay: i * 0.15,
                ease: "power3.out"
            });
        });

        // 8. WhatsApp Floating Button — Pulse Ring
        gsap.to('.whatsapp-btn', {
            y: -6, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut"
        });
    }
});
