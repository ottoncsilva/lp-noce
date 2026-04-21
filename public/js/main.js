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
    // 0. Viewport real — mede a altura exata da janela visível no dispositivo
    //    e injeta como variável CSS. Funciona em TODOS os celulares.
    function setRealVh() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--real-vh', `${vh}px`);
    }
    setRealVh();
    window.addEventListener('resize', setRealVh);
    window.addEventListener('orientationchange', () => setTimeout(setRealVh, 150));

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
        setTimeout(() => {
            initAnimations();
            initPremiumFeatures();
        }, 100);
    } catch (err) {
        console.error("Error loading content:", err);
        const hero = document.querySelector('.hero');
        if (hero) {
            const notice = document.createElement('p');
            notice.style.cssText = 'position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.5);font-size:0.8rem;';
            notice.textContent = 'Conteúdo temporariamente indisponível.';
            hero.appendChild(notice);
        }
    }

    function populateDOM(data) {
        // Favicon dinâmico
        if (data.favicon) {
            const faviconEl = document.querySelector('link[rel="icon"]');
            const touchEl = document.querySelector('link[rel="apple-touch-icon"]');
            if (faviconEl) faviconEl.href = data.favicon;
            if (touchEl) touchEl.href = data.favicon;
        }

        // Logo do header fixo (canto superior esquerdo)
        const headerLogoUrl = data.logo || '/images/placeholder.jpg';
        document.querySelectorAll('.fixed-ui .main-logo-img').forEach(el => el.src = headerLogoUrl);

        // Logo do Hero (central, grande) — campo separado, com fallback para logo principal
        const heroLogoUrl = data.logoHero || data.logo || '/images/placeholder.jpg';
        document.querySelectorAll('.hero-content .main-logo-img').forEach(el => el.src = heroLogoUrl);

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

                                const fitDesk = typeof img === 'object' && img.fitDesktop ? img.fitDesktop : 'cover';
                                const fitMob  = typeof img === 'object' && img.fitMobile  ? img.fitMobile  : 'cover';

                                return `
                                <div class="gallery-item">
                                    <img src="${imgSrc}" alt="${sectionLabel} - Noce Mobili" loading="lazy"
                                        style="--pos-desk: ${safePosDesk}; --pos-mob: ${safePosMob}; --fit-desk: ${fitDesk}; --fit-mob: ${fitMob};" width="1920" height="1080">
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
                const imgHTML = item.image ? `<img src="${item.image}" loading="lazy" alt="${escHtml(item.name)}">` : '<div style="width:100%; height:100%; background:#333;"></div>';
                const swatchHTML = `
                    <div class="swatch">
                        ${imgHTML}
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
            const defaultNarrative = 'Mais do que criar móveis, nós projetamos atmosferas. A nossa jornada começa com a Escuta — um mergulho profundo na sua rotina, nos seus desejos e na forma como você vivencia o seu lar. Com essa essência em mãos, partimos para uma rigorosa Curadoria, selecionando a dedo materiais e texturas de altíssimo padrão que refletem a sua identidade. Na fase de Projeto, aliamos tecnologia de precisão ao design autoral para modelar cada milímetro, garantindo perfeição técnica e estética. Por fim, a Entrega transcende a montagem: é o momento onde a sua nova realidade toma forma, superando o que um dia existiu apenas no papel.';

            if (data.processo && data.processo.narrative && data.processo.narrative.trim()) {
                // Narrativa personalizada via admin tem prioridade
                procNarrative.textContent = data.processo.narrative;
            } else if (data.processo && data.processo.items && data.processo.items.length > 0) {
                // Gerar narrativa automaticamente a partir dos títulos das etapas
                const titles = data.processo.items.map(i => escHtml(i.title));
                const narrative = `Mais do que criar móveis, nós projetamos atmosferas. A nossa jornada começa com a ${titles[0] || 'Escuta'} — um mergulho profundo na sua rotina, nos seus desejos e na forma como você vivencia o seu lar. Com essa essência em mãos, partimos para uma rigorosa ${titles[1] || 'Curadoria'}, selecionando a dedo materiais e texturas de altíssimo padrão que refletem a sua identidade. Na fase de ${titles[2] || 'Projeto'}, aliamos tecnologia de precisão ao design autoral para modelar cada milímetro, garantindo perfeição técnica e estética. Por fim, a ${titles[3] || 'Entrega'} transcende a montagem: é o momento onde a sua nova realidade toma forma, superando o que um dia existiu apenas no papel.`;
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

        const footerAddr = document.getElementById('footer-address');
        if(footerAddr) {
            const loc = (data.localizacao && data.localizacao.endereco) || '';
            footerAddr.textContent = loc;
        }
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

        // Zero Gravity removido para usar flex grid em todas as telas

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

        // 9. Lightbox Gallery — navegação lateral, foto completa, swipe + teclado
        initLightboxGallery();
    }

    // ═══════════════════════════════════════════════════════════════
    // PREMIUM FEATURES
    // ═══════════════════════════════════════════════════════════════

    function initPremiumFeatures() {

        // ── 2. SCROLL PROGRESS BAR ──────────────────────────────
        const progressBar = document.getElementById('scroll-progress');
        if (progressBar) {
            window.addEventListener('scroll', () => {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
                progressBar.style.width = progress + '%';
            }, { passive: true });
        }

        // ── 3. SPLIT TEXT ANIMATION (Manifesto) ─────────────────
        const manifestoBody = document.querySelector('.m-body');
        if (manifestoBody && manifestoBody.textContent.trim()) {
            const text = manifestoBody.textContent.trim();
            const words = text.split(/\s+/);
            manifestoBody.innerHTML = words.map(w =>
                `<span class="word-reveal"><span>${w}</span></span>`
            ).join(' ');

            const wordSpans = manifestoBody.querySelectorAll('.word-reveal span');
            gsap.from(wordSpans, {
                scrollTrigger: {
                    trigger: '.manifesto',
                    start: 'top 60%',
                },
                y: 40,
                opacity: 0,
                duration: 0.6,
                stagger: 0.04,
                ease: 'power3.out'
            });
        }

        // ── 4. FADE + SCALE REVEAL (Materialidade swatches — mais rápido e fluido) ──
        const swatches = document.querySelectorAll('.acabamentos-wrapper .swatch');
        if (swatches.length > 0) {
            gsap.from(swatches, {
                scrollTrigger: {
                    trigger: '.acabamentos-wrapper',
                    start: 'top 80%',
                },
                scale: 0.7,
                opacity: 0,
                duration: 0.45,
                stagger: { each: 0.04, from: 'start' },
                ease: 'back.out(1.4)',
                clearProps: 'scale,opacity'
            });
        }

        // ── 5. COUNTER ANIMADO ("17 anos") ──────────────────────
        const ctaMidText = document.getElementById('cta-mid-text');
        if (ctaMidText) {
            const originalText = ctaMidText.textContent;
            const numberMatch = originalText.match(/(\d+)/);
            if (numberMatch) {
                const target = parseInt(numberMatch[1]);
                const prefix = originalText.substring(0, originalText.indexOf(numberMatch[0]));
                const suffix = originalText.substring(originalText.indexOf(numberMatch[0]) + numberMatch[0].length);
                
                // Create counter span
                const counterSpan = document.createElement('span');
                counterSpan.className = 'counter-num';
                counterSpan.textContent = '0';
                ctaMidText.textContent = '';
                ctaMidText.appendChild(document.createTextNode(prefix));
                ctaMidText.appendChild(counterSpan);
                ctaMidText.appendChild(document.createTextNode(suffix));

                const counter = { val: 0 };
                ScrollTrigger.create({
                    trigger: '#cta-mid',
                    start: 'top 70%',
                    once: true,
                    onEnter: () => {
                        gsap.to(counter, {
                            val: target,
                            duration: 2,
                            ease: 'power2.out',
                            onUpdate: () => {
                                counterSpan.textContent = Math.round(counter.val);
                            }
                        });
                    }
                });
            }
        }

        // ── 6. SMART HEADER (Auto-hide + Cor Adaptativa) ────────
        const fixedUI = document.querySelector('.fixed-ui');
        if (fixedUI) {
            let lastScroll = 0;
            const THRESHOLD = 80;

            window.addEventListener('scroll', () => {
                const currentScroll = window.scrollY;
                
                // Auto-hide: esconde ao rolar para baixo, mostra ao rolar para cima
                if (currentScroll > THRESHOLD) {
                    if (currentScroll > lastScroll) {
                        fixedUI.classList.add('header-hidden');
                    } else {
                        fixedUI.classList.remove('header-hidden');
                    }
                } else {
                    fixedUI.classList.remove('header-hidden');
                }

                // Cor adaptativa — checa em qual seção o topo da tela está
                const sections = document.querySelectorAll('.section');
                let inLightSection = false;
                sections.forEach(sec => {
                    const rect = sec.getBoundingClientRect();
                    if (rect.top <= 60 && rect.bottom >= 60) {
                        // Seções com fundo claro
                        if (sec.classList.contains('acabamentos-sec') || 
                            sec.classList.contains('faq-sec')) {
                            inLightSection = true;
                        }
                    }
                });

                if (inLightSection) {
                    fixedUI.classList.add('header-dark');
                } else {
                    fixedUI.classList.remove('header-dark');
                }

                lastScroll = currentScroll;
            }, { passive: true });
        }

        // ── 9. PARALLAX NO HERO ─────────────────────────────────
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            gsap.to(heroContent, {
                scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.5,
                },
                y: '20%',
                opacity: 0.3,
                ease: 'none'
            });
        }

        // ── 10. LETTER SPACING ANIMATION ────────────────────────
        const lsTargets = document.querySelectorAll('.section-entry-word, .parceiros-title, .faq-title, .proc-title');
        lsTargets.forEach(el => {
            gsap.from(el, {
                scrollTrigger: {
                    trigger: el,
                    start: 'top 80%',
                },
                letterSpacing: '0.3em',
                opacity: 0,
                duration: 1.2,
                ease: 'power3.out'
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // LIGHTBOX GALLERY
    // ═══════════════════════════════════════════════════════════════

    function initLightboxGallery() {
        const lb      = document.getElementById('lightbox');
        const track   = document.getElementById('lb-track');
        const counter = document.getElementById('lb-counter');
        const btnClose = document.getElementById('lb-close');
        const btnPrev  = document.getElementById('lb-prev');
        const btnNext  = document.getElementById('lb-next');
        if (!lb || !track) return;

        let images = [];   // array of src strings for current section
        let idx = 0;       // current index
        let touchStartX = 0;
        let touchStartY = 0;
        let isDragging  = false;
        let dragStartX  = 0;
        let dragOffset  = 0;

        function open(srcs, startIdx) {
            images = srcs;
            idx    = startIdx;

            track.innerHTML = images.map(src =>
                `<div class="lb-slide"><img src="${escHtml(src)}" alt="" draggable="false"></div>`
            ).join('');

            lb.classList.add('active');
            document.body.style.overflow = 'hidden';
            update(false);
        }

        function close() {
            lb.classList.remove('active');
            document.body.style.overflow = '';
        }

        function update(animate = true) {
            if (!animate) track.style.transition = 'none';
            track.style.transform = `translateX(calc(-${idx} * 100vw))`;
            if (!animate) requestAnimationFrame(() => { track.style.transition = ''; });

            counter.textContent = `${idx + 1} / ${images.length}`;
            btnPrev.classList.toggle('hidden', idx === 0);
            btnNext.classList.toggle('hidden', idx === images.length - 1);
        }

        function prev() { if (idx > 0) { idx--; update(); } }
        function next() { if (idx < images.length - 1) { idx++; update(); } }

        // Click on gallery image
        document.body.addEventListener('click', e => {
            const img = e.target.closest('.gallery-item img');
            if (!img) return;
            const section = img.closest('.ambiente-pin-wrap');
            if (!section) return;
            const allImgs = [...section.querySelectorAll('.gallery-item img')];
            const clickedIdx = allImgs.indexOf(img);
            open(allImgs.map(i => i.src), clickedIdx);
        });

        // Close button
        btnClose.addEventListener('click', close);

        // Click on backdrop (outside slide area)
        lb.addEventListener('click', e => {
            if (e.target === lb || e.target === document.getElementById('lb-track-wrap')) close();
        });

        // Arrow buttons
        btnPrev.addEventListener('click', e => { e.stopPropagation(); prev(); });
        btnNext.addEventListener('click', e => { e.stopPropagation(); next(); });

        // Keyboard
        document.addEventListener('keydown', e => {
            if (!lb.classList.contains('active')) return;
            if (e.key === 'Escape')      close();
            if (e.key === 'ArrowRight')  next();
            if (e.key === 'ArrowLeft')   prev();
        });

        // Touch swipe
        lb.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        lb.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
                if (dx < 0) next(); else prev();
            }
        }, { passive: true });

        // Mouse drag (desktop)
        track.addEventListener('mousedown', e => {
            if (e.target.closest('.lb-close, .lb-arrow')) return;
            isDragging = true;
            dragStartX = e.clientX;
            dragOffset = 0;
            track.style.transition = 'none';
            track.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', e => {
            if (!isDragging) return;
            dragOffset = e.clientX - dragStartX;
            const base = -idx * window.innerWidth;
            track.style.transform = `translateX(${base + dragOffset}px)`;
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            track.style.cursor = '';
            track.style.transition = '';
            if (dragOffset < -60) next();
            else if (dragOffset > 60) prev();
            else update();
        });
    }
});
