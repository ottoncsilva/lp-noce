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
        setTimeout(initAnimations, 100); // Give DOM time to update
    } catch (err) {
        console.error("Error loading content:", err);
        // Fallback to local data if running purely staticaly or error
    }

    function populateDOM(data) {
        // Hero
        document.querySelector('.hero-logo').textContent = 'NOCE'; // NOCE
        document.querySelector('.hero-tagline').textContent = data.tagline;

        // Manifesto
        document.querySelector('.m-part1').textContent = data.manifesto.headline.split('não')[0] + ' não';
        document.querySelector('.m-part2').textContent = data.manifesto.headline.split('não')[1].trim();
        document.querySelector('.m-body').textContent = data.manifesto.body;

        // Ambientes (Horizontal Scroll)
        const ambContainer = document.getElementById('ambientes-container');
        const sections = ['cozinha', 'living', 'closet', 'banheiro', 'corporativo'];
        
        sections.forEach(secName => {
            const secData = data.sections[secName];
            if(!secData) return;
            
            const html = `
                <section class="section ambiente-pin-wrap" id="sec-${secName}">
                    <div class="ambiente-entry">
                        <h2 class="ambiente-word">${secData.label}</h2>
                    </div>
                    <div class="ambiente-track">
                        ${secData.images && secData.images.length > 0 
                            ? secData.images.map(img => `
                                <div class="gallery-item">
                                    <img src="${img}" alt="${secData.label}">
                                    <div class="gallery-sweep-line"></div>
                                </div>
                            `).join('')
                            : `<div class="gallery-item"><img src="/images/placeholder.jpg"><div class="gallery-sweep-line"></div></div>`
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
                // Random position logic for zero-gravity
                const left = 5 + Math.random() * 80; // 5% to 85%
                const top = 10 + Math.random() * 150; // 10% to 160% (overflow height)
                
                // fallback colors if no image
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
                spot.insertAdjacentHTML('beforeend', `<img src="${img}" class="parc-logo" alt="${p.name}">`);
            });
        }

        // CTA
        document.querySelector('.cta-headline').textContent = data.cta.headline;
        document.getElementById('btn-whats').href = `https://wa.me/${data.cta.whatsapp}`;
        document.getElementById('btn-insta').href = `https://instagram.com/${data.cta.instagram}`;
    }

    function initAnimations() {
        // Register ScrollTrigger
        gsap.registerPlugin(ScrollTrigger);

        // 1. Hero Animation
        const tlHero = gsap.timeline();
        tlHero.to('.hero-bg', { opacity: 1, duration: 2, ease: "power2.inOut" })
              .from('.hero-logo', { opacity: 0, scale: 0.9, duration: 1.5, ease: "power3.out" }, "-=1")
              .from('.hero-tagline', { opacity: 0, y: 20, duration: 1 }, "-=0.5");
        
        // Ken burns effect
        gsap.to('.hero-bg', {
            scale: 1.05, duration: 20, repeat: -1, yoyo: true, ease: "none"
        });

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

        // 3. Ambientes (Horizontal Scroll & Pin)
        const ambientes = document.querySelectorAll('.ambiente-pin-wrap');
        
        ambientes.forEach(section => {
            const track = section.querySelector('.ambiente-track');
            const entryWord = section.querySelector('.ambiente-word');
            
            const wipeTl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: "top top",
                    end: "+=300%", // Pin for 3 screen heights
                    pin: true,
                    scrub: 1
                }
            });

            // Zoom out word
            wipeTl.to(entryWord, { scale: 0.5, opacity: 0, duration: 1 })
                  // Slide in the track horizontally
                  .to(track, {
                      x: () => -(track.scrollWidth - window.innerWidth) + "px",
                      ease: "none",
                      duration: 3
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

        // WhatsApp Floating Button loop
        gsap.to('.whatsapp-btn', {
            y: -10, duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut"
        });
    }
});
