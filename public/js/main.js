function escHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeCssUrl(url) {
    if (typeof url !== 'string') return '';
    // Only allow relative paths starting with /images/ or absolute https URLs without quotes/parens
    if (/^\/images\/[\w\-/.]+$/.test(url)) return url;
    if (/^https?:\/\/[^'"()]+$/.test(url)) return url;
    return '';
}

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
        if (!response.ok) throw new Error('Network error ' + response.status);
        const data = await response.json();

        populateDOM(data);
        setTimeout(initAnimations, 100);
    } catch (err) {
        console.error("Error loading content:", err);
        // Show user-visible fallback so the page is not silently blank
        const hero = document.querySelector('.hero');
        if (hero) {
            const notice = document.createElement('p');
            notice.style.cssText = 'position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.5);font-size:0.8rem;';
            notice.textContent = 'Conteúdo temporariamente indisponível.';
            hero.appendChild(notice);
        }
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
        const safeBg = data.heroBg ? safeCssUrl(data.heroBg) : '';
        if(safeBg && heroBgEl) {
            heroBgEl.style.backgroundImage = `url('${safeBg}')`;
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
        // Textos Globais
        const texts = data.texts || {};
        
        // Povoando Títulos
        const titleMaterialidade = document.querySelector('.acabamentos-sec .section-entry-word');
        if (titleMaterialidade) titleMaterialidade.textContent = texts.materialidadeTitle || 'MATERIALIDADE';
        
        const titleParceiros = document.querySelector('.parceiros-title');
        if (titleParceiros) titleParceiros.textContent = texts.parceirosTitle || 'Parceiros';
        
        const titleFaq = document.querySelector('.faq-title');
        if (titleFaq) titleFaq.textContent = texts.faqTitle || 'Perguntas Frequentes';

        const titleProcesso = document.querySelector('.proc-title');
        if (titleProcesso) titleProcesso.textContent = texts.processoTitle || 'O Nosso Processo';
        
        const midCtaEl = document.getElementById('cta-mid-text');
        if (midCtaEl) midCtaEl.textContent = texts.midCta || '17 anos criando ambientes únicos';

        // Manifesto
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

            const sectionLabel = escHtml(secData.label || secName);
            const html = `
                <section class="section ambiente-pin-wrap" id="sec-${escHtml(secName)}">
                    <div class="ambiente-entry">
                        <h2 class="ambiente-word">${sectionLabel}</h2>
                    </div>
                    <div class="swipe-icon-container">
                        <span class="swipe-text">Deslize</span>
                        <svg class="swipe-hand" viewBox="0 0 24 24"><path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.21 0-.62-.35-1.18-.91-1.42z"/></svg>
                    </div>
                    <button class="amb-arrow amb-arrow-prev" aria-label="Anterior">&#8592;</button>
                    <button class="amb-arrow amb-arrow-next" aria-label="Próxima">&#8594;</button>
                    <div class="ambiente-track">
                        ${secData.images && secData.images.length > 0
                            ? secData.images.map(img => {
                                const imgSrc = escHtml(typeof img === 'string' ? img : img.src);
                                const imgCap = typeof img === 'object' && img.caption ? escHtml(img.caption) : '';

                                const legacyPos = typeof img === 'object' && img.position ? img.position : 'center center';
                                const posDesk = typeof img === 'object' && img.positionDesktop ? img.positionDesktop : legacyPos;
                                const posMob = typeof img === 'object' && img.positionMobile ? img.positionMobile : legacyPos;
                                // Only allow safe CSS position values
                                const safePosDesk = /^[\w% ]+$/.test(posDesk) ? posDesk : 'center center';
                                const safePosMob = /^[\w% ]+$/.test(posMob) ? posMob : 'center center';

                                return `
                                <div class="gallery-item">
                                    <img src="${imgSrc}" alt="${sectionLabel} - Noce Mobili" loading="lazy"
                                        style="--pos-desk: ${safePosDesk}; --pos-mob: ${safePosMob};" width="1920" height="1080">
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
            let _swatchZCounter = 10;
            data.acabamentos.items.forEach((item, i) => {
                // Tighter horizontal range so swatches cluster more (less dead space)
                const left = 8 + Math.random() * 62;
                const top = 5 + Math.random() * 120;
                const bg = item.image ? `url(${item.image})` : '#333';

                const swatchHTML = `
                    <div class="swatch" style="left: ${left}%; top: ${top}%; background: ${bg}; background-size: cover; background-position: center;" data-speed="${0.5 + Math.random() * 1.5}">
                        <div class="name">${escHtml(item.name)}</div>
                    </div>
                `;
                wrapper.insertAdjacentHTML('beforeend', swatchHTML);
            });

            // Click to bring swatch to front (fixes overlapping on desktop)
            wrapper.addEventListener('click', e => {
                const swatch = e.target.closest('.swatch');
                if (!swatch) return;
                wrapper.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
                swatch.style.zIndex = ++_swatchZCounter;
                swatch.classList.add('active');
            });
        }

        // Parceiros
        if(data.parceiros && data.parceiros.items) {
            const spot = document.querySelector('.parceiros-spotlight');
            data.parceiros.items.forEach(p => {
                const img = p.image || '/images/placeholder.jpg';
                spot.insertAdjacentHTML('beforeend', `<img src="${escHtml(img)}" class="parc-logo" alt="Parceiro ${escHtml(p.name || '')}" loading="lazy">`);
            });
        }

        // Processo — Texto narrativo
        const procNarrative = document.getElementById('proc-narrative');
        if (procNarrative) {
            const defaultNarrative = 'Tudo começa com a Escuta — onde entendemos seu estilo, rotina e desejos. A partir daí, a Curadoria seleciona materiais e acabamentos que traduzem a sua essência. O Projeto ganha forma em cada detalhe milimétrico. E a Entrega transforma o papel em realidade.';
            
            if (data.processo && data.processo.items && data.processo.items.length > 0) {
                // Compor narrativa a partir dos items da API
                const titles = data.processo.items.map(i => escHtml(i.title));
                const narrative = `Tudo começa com a ${titles[0] || 'Escuta'} — onde entendemos seu estilo, rotina e desejos. A partir daí, a ${titles[1] || 'Curadoria'} seleciona materiais e acabamentos que traduzem a sua essência. O ${titles[2] || 'Projeto'} ganha forma em cada detalhe milimétrico. E a ${titles[3] || 'Entrega'} transforma o papel em realidade.`;
                procNarrative.textContent = narrative;
            } else {
                procNarrative.textContent = defaultNarrative;
            }
        }

        // FAQ
        if(data.faq && data.faq.items && data.faq.items.length > 0) {
            const faqContainer = document.getElementById('faq-list-container');
            if (faqContainer) {
                data.faq.items.forEach((item, idx) => {
                    const isOpen = idx === 0 ? 'open' : '';
                    const html = `
                    <details class="faq-item" ${isOpen}>
                        <summary>${escHtml(item.q)}</summary>
                        <p>${escHtml(item.a)}</p>
                    </details>`;
                    faqContainer.insertAdjacentHTML('beforeend', html);
                });
            }
        } else {
            // Fallback minimal
            const faqContainer = document.getElementById('faq-list-container');
            if (faqContainer && faqContainer.children.length === 0) {
                faqContainer.innerHTML = `
                    <details class="faq-item" open>
                        <summary>Como adicionar perguntas?</summary>
                        <p>Adicione-as no painel Admin > Conteúdo.</p>
                    </details>`;
            }
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

        // 3. Ambientes (Horizontal Scroll & Pin — apenas mobile / setas no desktop)
        const ambientes = document.querySelectorAll('.ambiente-pin-wrap');
        
        let mm = gsap.matchMedia();

        ambientes.forEach(section => {
            const track = section.querySelector('.ambiente-track');
            const entryWord = section.querySelector('.ambiente-word');
            const swipeIcon = section.querySelector('.swipe-icon-container');

            // ── DESKTOP: Navegação por setas (sem pin/scroll)
            mm.add("(min-width: 769px)", () => {
                // Scroll horizontal suave via botões de seta
                const btnPrev = section.querySelector('.amb-arrow-prev');
                const btnNext = section.querySelector('.amb-arrow-next');

                const SCROLL_STEP = () => window.innerWidth * 0.8;

                if (btnNext) {
                    btnNext.addEventListener('click', () => {
                        track.scrollBy({ left: SCROLL_STEP(), behavior: 'smooth' });
                    });
                }
                if (btnPrev) {
                    btnPrev.addEventListener('click', () => {
                        track.scrollBy({ left: -SCROLL_STEP(), behavior: 'smooth' });
                    });
                }

                // Mostrar/esconder setas conforme posição
                const updateArrows = () => {
                    if (!btnPrev || !btnNext) return;
                    btnPrev.style.opacity = track.scrollLeft > 10 ? '1' : '0.3';
                    btnNext.style.opacity = track.scrollLeft < (track.scrollWidth - track.clientWidth - 10) ? '1' : '0.3';
                };
                track.addEventListener('scroll', updateArrows, { passive: true });
                requestAnimationFrame(updateArrows);

                // Animação de entrada do título (sem scroll-pin)
                gsap.to(entryWord, {
                    scrollTrigger: {
                        trigger: section,
                        start: "top center",
                        end: "top top",
                        scrub: true
                    },
                    scale: 0.6,
                    opacity: 0.1
                });
            });

            // ── MOBILE: Swipe nativo + ícone indicador
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

        // 4. Acabamentos (Zero Gravity Parallax — desktop only)
        mm.add("(min-width: 769px)", () => {
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

        // 6. Processo Narrative Animation (Fade Up)
        const procNarrEl = document.querySelector('.proc-narrative');
        if (procNarrEl) {
            gsap.from(procNarrEl, {
                scrollTrigger: {
                    trigger: '.processo',
                    start: "top 70%",
                },
                y: 30,
                opacity: 0,
                duration: 1.2,
                ease: "power3.out"
            });
        }

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

        // 9. Lightbox for Gallery Items
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        
        if (lightbox && lightboxImg) {
            // Event delegation on body for gallery items
            document.body.addEventListener('click', (e) => {
                const galleryImg = e.target.closest('.gallery-item img');
                if (galleryImg) {
                    lightboxImg.src = galleryImg.src;
                    lightbox.classList.add('active');
                } else if (lightbox.classList.contains('active')) {
                    // Clicou fora da imagem ou em qualquer lugar
                    lightbox.classList.remove('active');
                }
            });
        }
    }
});
