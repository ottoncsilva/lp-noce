// ============================================================
// NOCE MOBILI — Admin JS
// Versão: 2.0 — Gestão dinâmica + Drag & Drop + Color Picker
// ============================================================

let siteData = {};
let currentPanel = 'geral';

// Debounced save — prevents rapid consecutive saves (e.g. typing in a caption field)
let _saveDebounceTimer = null;
function debouncedSave(delay = 800) {
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => saveContent(false), delay);
}

// ── Ordem padrão das categorias de ambiente
const DEFAULT_SECTIONS = ['cozinha', 'living', 'closet', 'banheiro', 'corporativo'];

// ── opções de object-position para as fotos
const POSITION_OPTIONS = [
    { value: 'center center', label: 'Centro' },
    { value: 'top center',    label: 'Topo' },
    { value: 'bottom center', label: 'Base' },
    { value: 'center left',   label: 'Esquerda' },
    { value: 'center right',  label: 'Direita' },
];

document.addEventListener("DOMContentLoaded", async () => {
    await fetchContent();
    renderSidebar();
    buildPanels();
    activatePanel('geral');
    setupMobileMenu();
});

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────

async function fetchContent() {
    try {
        const res = await fetch('/api/content');
        if (!res.ok) throw new Error('Network error ' + res.status);
        const raw = await res.json();

        // Aceita tanto objeto vazio quanto dados existentes
        siteData = raw || {};

        // Garante sections
        if (!siteData.sections) siteData.sections = {};

        // Normaliza cada section padrão — insere se não existir, garante .label
        DEFAULT_SECTIONS.forEach(s => {
            if (!siteData.sections[s]) {
                siteData.sections[s] = { label: capitalize(s), headline: '', images: [] };
            } else if (!siteData.sections[s].label) {
                // Dados antigos sem .label — inferir pelo ID
                siteData.sections[s].label = capitalize(s);
            }
        });

        // Normaliza categorias extras que já existem no JSON
        Object.keys(siteData.sections).forEach(secId => {
            if (!siteData.sections[secId].label) {
                siteData.sections[secId].label = capitalize(secId);
            }
            if (!siteData.sections[secId].images) {
                siteData.sections[secId].images = [];
            }
        });

        // Garante sectionOrder
        if (!siteData.sectionOrder || !Array.isArray(siteData.sectionOrder) || siteData.sectionOrder.length === 0) {
            siteData.sectionOrder = Object.keys(siteData.sections);
        }

        // Garante acabamentos e parceiros no nível raiz
        if (!siteData.acabamentos) siteData.acabamentos = { headline: '', items: [] };
        if (!Array.isArray(siteData.acabamentos.items)) siteData.acabamentos.items = [];
        if (!siteData.parceiros)   siteData.parceiros   = { headline: '', items: [] };
        if (!Array.isArray(siteData.parceiros.items)) siteData.parceiros.items = [];
        
        // Fase 1: Conteudos (Textos, FAQ, Processo)
        if (!siteData.texts) siteData.texts = {};
        if (!siteData.processo) siteData.processo = { items: [] };
        if (!siteData.faq) siteData.faq = { items: [] };

        // Preenche FAQs padrão se ainda não existirem
        if (siteData.faq.items.length === 0) {
            siteData.faq.items = [
                { q: 'Quanto custa um projeto de móveis planejados?', a: 'Cada projeto é único e o investimento depende da complexidade, dos materiais escolhidos e do escopo. Oferecemos consultoria gratuita para entender suas necessidades e apresentar um orçamento personalizado.' },
                { q: 'Qual é o prazo de entrega?', a: 'O prazo varia de acordo com o projeto, geralmente entre 45 e 90 dias após a aprovação do projeto executivo. Trabalhamos com cronograma transparente do início ao fim.' },
                { q: 'Vocês atendem em qual região?', a: 'Atendemos toda a Grande São Paulo e região metropolitana. Para outros estados, consulte nossa equipe.' },
                { q: 'Como funciona a consultoria?', a: 'Tudo começa com uma conversa para entender seu estilo, necessidades e orçamento. Em seguida, nossa equipe cria um projeto exclusivo com curadoria de materiais e acompanhamento completo até a entrega.' }
            ];
        }

        if (!siteData.cta) siteData.cta = {};

    } catch(err) {
        console.warn('fetchContent error:', err);
        showToast('Erro ao carregar dados — usando estrutura padrão', 'error');

        // Inicializa estrutura mínima para não quebrar a UI
        if (!siteData.sections) siteData.sections = {};
        DEFAULT_SECTIONS.forEach(s => {
            if (!siteData.sections[s]) siteData.sections[s] = { label: capitalize(s), headline: '', images: [] };
        });
        if (!siteData.sectionOrder) siteData.sectionOrder = [...DEFAULT_SECTIONS];
        if (!siteData.acabamentos)  siteData.acabamentos = { headline: '', items: [] };
        if (!siteData.parceiros)    siteData.parceiros = { headline: '', items: [] };
        if (!siteData.cta)          siteData.cta = {};
    }
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR — dinâmica com submenu de ambientes
// ─────────────────────────────────────────────────────────────

function renderSidebar() {
    try {
        const nav = document.getElementById('sidebar-nav');
        const order = (siteData.sectionOrder && siteData.sectionOrder.length > 0)
            ? siteData.sectionOrder
            : Object.keys(siteData.sections || {});

        nav.innerHTML = `
            <div class="nav-section-title">Configuração</div>
            <button class="nav-item" data-target="geral" onclick="activatePanel('geral')">
                ${iconGear()} Identidade
            </button>
            <button class="nav-item" data-target="hero" onclick="activatePanel('hero')">
                ${iconImage()} Hero
            </button>
            <button class="nav-item" data-target="conteudo" onclick="activatePanel('conteudo')">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style="flex-shrink:0"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> 
                Conteúdo da Pág.
            </button>
            <button class="nav-item" data-target="config" onclick="activatePanel('config')">
                ${iconSettings()} Contato
            </button>

            <div class="nav-section-title" style="margin-top:0.5rem;">Ambientes</div>
            <div class="nav-group open" id="nav-group-ambientes">
                <div class="nav-group-header">
                    <button class="nav-group-toggle" onclick="toggleNavGroup('nav-group-ambientes')">
                        ${iconRooms()} Ambientes ${iconChevron()}
                    </button>
                    <button class="btn-add-cat" onclick="openNewCategoryModal(event)" title="Nova categoria">+</button>
                </div>
                <div class="nav-submenu" id="submenu-ambientes">
                    ${order.map(secId => {
                        if (!siteData.sections || !siteData.sections[secId]) return '';
                        const lbl = siteData.sections[secId].label || capitalize(secId);
                        return `<button class="nav-sub-item" data-target="${secId}" onclick="activatePanel('${secId}')">${iconRoom()} ${escHtml(lbl)}</button>`;
                    }).join('')}
                </div>
            </div>

            <div class="nav-section-title" style="margin-top:0.5rem;">Catálogo</div>
            <button class="nav-item" data-target="acabamentos" onclick="activatePanel('acabamentos')">
                ${iconPalette()} Acabamentos
            </button>
            <button class="nav-item" data-target="parceiros" onclick="activatePanel('parceiros')">
                ${iconPartners()} Parceiros
            </button>
        `;
    } catch(err) {
        console.error('renderSidebar error:', err);
        const nav = document.getElementById('sidebar-nav');
        if (nav) nav.innerHTML = `
            <div class="nav-section-title">Navegação</div>
            <button class="nav-item active" onclick="activatePanel('geral')" data-target="geral">${iconGear()} Geral</button>
        `;
    }
}


function toggleNavGroup(id) {
    document.getElementById(id).classList.toggle('open');
}

function updateSidebarActive(target) {
    document.querySelectorAll('.nav-item, .nav-sub-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`[data-target="${target}"]`);
    if (active) active.classList.add('active');
}

// ─────────────────────────────────────────────────────────────
// PANELS — build all
// ─────────────────────────────────────────────────────────────

function buildPanels() {
    const container = document.getElementById('panels-container');
    container.innerHTML = '';

    buildGeralPanel(container);
    buildHeroPanel(container);
    buildConteudoPanel(container);
    buildConfigPanel(container);

    const order = siteData.sectionOrder || Object.keys(siteData.sections);
    order.forEach(secId => {
        if (siteData.sections[secId]) {
            buildAmbientePanel(container, secId);
        }
    });

    buildListPanel(container, 'acabamentos', siteData.acabamentos);
    buildListPanel(container, 'parceiros', siteData.parceiros);
}

// ── Panel: Identidade (logotipos separados)
function buildGeralPanel(container) {
    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-geral">
            <div class="card">
                <div class="card-header">
                    <h3>Logo do Header</h3>
                </div>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem;">Logo pequena exibida no canto superior esquerdo do site. Use PNG com fundo transparente.</p>
                <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
                    ${siteData.logo
                        ? `<img src="${siteData.logo}" style="height:40px;background:#233728;padding:6px;border-radius:4px;" alt="Logo Header">`
                        : `<span style="color:#999;font-size:0.85rem;">Nenhum logo enviado</span>`}
                    <input type="file" id="file-logo" accept="image/*" style="display:none" onchange="uploadLogoGlobal(event)">
                    <button class="btn btn-sm" onclick="document.getElementById('file-logo').click()">Upload</button>
                    ${siteData.logo ? `<button class="btn btn-sm btn-danger" onclick="removeLogoGlobal()">Remover</button>` : ''}
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Logo do Hero</h3>
                </div>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem;">Logo grande exibida no centro da tela inicial (Hero). Se não for enviada, será usada a logo do header.</p>
                <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
                    ${siteData.logoHero
                        ? `<img src="${siteData.logoHero}" style="height:60px;background:#233728;padding:8px;border-radius:4px;" alt="Logo Hero">`
                        : `<span style="color:#999;font-size:0.85rem;">Usando logo do header como fallback</span>`}
                    <input type="file" id="file-logo-hero" accept="image/*" style="display:none" onchange="uploadLogoHero(event)">
                    <button class="btn btn-sm" onclick="document.getElementById('file-logo-hero').click()">Upload</button>
                    ${siteData.logoHero ? `<button class="btn btn-sm btn-danger" onclick="removeLogoHero()">Remover</button>` : ''}
                </div>
            </div>
        </div>
    `);
}

// ── Panel: Hero (cor de fundo + imagem de fundo)
function buildHeroPanel(container) {
    const heroBgColor = siteData.heroBgColor || '#233728';
    const heroBg = siteData.heroBg || '';

    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-hero">
            <div class="card">
                <div class="card-header"><h3>Cor de Fundo do Hero</h3></div>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem;">
                    Escolha a cor de fundo exibida antes e durante o carregamento da imagem. Ideal para usar com logo PNG sem fundo.
                </p>
                <div class="hero-preview" id="hero-color-preview" style="background:${heroBgColor};">
                    ${siteData.logo ? `<img src="${siteData.logo}" alt="logo preview">` : '<span style="color:rgba(255,255,255,0.4);font-size:0.75rem;letter-spacing:0.1em;">NOCE MOBILI</span>'}
                </div>
                <div class="form-group">
                    <label>Cor do fundo</label>
                    <div class="color-row">
                        <input type="color" id="inp-hero-color" value="${heroBgColor}" oninput="previewHeroColor(this.value)">
                        <input type="text" class="color-hex-input" id="inp-hero-color-hex" value="${heroBgColor}"
                            placeholder="#233728" onchange="syncColorFromHex(this.value)">
                    </div>
                </div>

                <div class="form-group">
                    <label>Tamanho da Logo no Desktop/Tablet (ex: 12vw ou 200px)</label>
                    <input type="text" id="inp-hero-logo-size-desktop" value="${siteData.heroLogoSizeDesktop || '12vw'}" placeholder="Ex: 12vw">
                </div>
                
                <div class="form-group">
                    <label>Tamanho da Logo no Mobile (ex: 25vw ou 150px)</label>
                    <input type="text" id="inp-hero-logo-size-mobile" value="${siteData.heroLogoSizeMobile || '25vw'}" placeholder="Ex: 25vw">
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Imagem de Fundo (opcional)</h3></div>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem;">
                    Se enviada, será sobreposta à cor de fundo. Se não houver imagem, a cor é usada.
                </p>
                <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
                    ${heroBg
                        ? `<img src="${heroBg}" style="height:70px;border-radius:4px;object-fit:cover;" alt="Hero BG">`
                        : `<span style="color:#999;font-size:0.85rem;">Sem imagem de fundo</span>`}
                    <input type="file" id="file-hero-bg" accept="image/*" style="display:none" onchange="uploadHeroBg(event)">
                    <button class="btn btn-sm" onclick="document.getElementById('file-hero-bg').click()">Upload Imagem</button>
                    ${heroBg ? `<button class="btn btn-sm btn-danger" onclick="removeHeroBg()">Remover</button>` : ''}
                </div>
            </div>
        </div>
    `);
}

// ── Panel: Ambiente individual
function buildAmbientePanel(container, secId) {
    const sec = siteData.sections[secId] || {};
    const images = sec.images || [];
    const label = sec.label || capitalize(secId);

    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-${secId}">

            <div class="card">
                <div class="card-header"><h3>Configurações da Categoria</h3></div>
                <div class="cat-name-row">
                    <div class="form-group" style="flex:1;margin:0;">
                        <label>Nome exibido no site</label>
                        <input type="text" id="inp-${secId}-label" value="${escHtml(label)}" placeholder="Ex: Cozinha">
                    </div>
                    <div style="padding-top:1.5rem;">
                        <button class="btn btn-sm btn-danger" onclick="deleteCategory('${secId}')">Excluir Categoria</button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Galeria de Imagens</h3>
                    <span class="info-chip">⠿ Arraste para reordenar</span>
                </div>
                <div class="drop-zone" id="dz-${secId}">
                    📁 Arraste fotos aqui ou clique para selecionar
                </div>
                <div class="upload-progress" id="prog-${secId}">
                    <div class="upload-progress-bar" id="progbar-${secId}"></div>
                </div>
                <input type="file" id="file-${secId}" multiple accept="image/*" style="display:none">
                <div class="gallery-preview" id="gal-${secId}">
                    ${images.map((imgObj, idx) => buildImgCard(secId, imgObj, idx)).join('')}
                </div>
            </div>
        </div>
    `);

    setupDropZone(secId);
    setupGalleryDrag(secId);
}

function buildImgCard(secId, imgObj, idx) {
    const src = typeof imgObj === 'string' ? imgObj : imgObj.src;
    const cap = typeof imgObj === 'object' ? (imgObj.caption || '') : '';
    // Retro-compatibility to 'position'
    const legacyPos = typeof imgObj === 'object' ? (imgObj.position || 'center center') : 'center center';
    const posDesk = typeof imgObj === 'object' ? (imgObj.positionDesktop || legacyPos) : 'center center';
    const posMob = typeof imgObj === 'object' ? (imgObj.positionMobile || legacyPos) : 'center center';

    return `
        <div class="img-card" draggable="true" data-idx="${idx}" data-section="${secId}">
            <span class="drag-handle" title="Arrastar">⠿</span>
            <img src="${escHtml(src)}" alt="Imagem ${idx+1}">
            <button class="btn-delete-img" onclick="deleteImage('${secId}', '${escHtml(src)}')" title="Apagar">✕</button>
            <div class="img-card-meta">
                <input type="text" placeholder="Legenda..." value="${escHtml(cap)}"
                    onchange="updateImageField('${secId}', ${idx}, 'caption', this.value)">
                <button onclick="openCropModal('${secId}', ${idx}, '${posDesk}', '${posMob}')" style="font-size:0.75rem; padding:4px; margin-top:5px; border:1px solid var(--border); border-radius:4px; cursor:pointer;" title="Enquadramento Mobile e Desktop">
                    📸 Foco / Enquadrar
                </button>
            </div>
        </div>
    `;
}

// ── Panel: Acabamentos / Parceiros (lista com drag)
function buildListPanel(container, secId, sec) {
    const items = (sec && sec.items) ? sec.items : [];
    const headline = (sec && sec.headline) ? sec.headline : '';
    const titleLabel = secId === 'acabamentos' ? 'Acabamentos' : 'Parceiros';

    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-${secId}">
            <div class="card">
                <div class="card-header"><h3>Informações</h3></div>
                <div class="form-group">
                    <label>Título da Seção</label>
                    <input type="text" id="inp-${secId}-head" value="${escHtml(headline)}">
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Itens — ${titleLabel}</h3>
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <span class="info-chip">⠿ Arraste para reordenar</span>
                        <button class="btn btn-sm" onclick="addNewItem('${secId}')">+ Novo</button>
                    </div>
                </div>
                <div class="items-list" id="list-${secId}">
                    ${items.map((item, idx) => buildItemRow(secId, item, idx)).join('')}
                </div>
            </div>
        </div>
    `);

    setupListDrag(secId);
}

function buildItemRow(secId, item, idx) {
    return `
        <div class="item-row" draggable="true" data-idx="${idx}" data-section="${secId}">
            <span class="drag-grip" title="Arrastar">
                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </span>
            ${item.image
                ? `<img src="${escHtml(item.image)}" alt="${escHtml(item.name)}">`
                : `<div style="width:36px;height:36px;background:#eee;border-radius:3px;border:1px solid var(--border);"></div>`}
            <input type="text" value="${escHtml(item.name)}"
                onchange="updateItemField('${secId}', ${idx}, 'name', this.value)"
                placeholder="Nome" style="flex:1;">
            <input type="file" id="fi-${secId}-${idx}" accept="image/*" style="display:none"
                onchange="uploadItemImage(event, '${secId}', ${idx})">
            <button class="btn btn-sm btn-outline" onclick="document.getElementById('fi-${secId}-${idx}').click()">Foto</button>
            <button class="btn btn-sm btn-danger" onclick="deleteItem('${secId}', ${idx})">✕</button>
        </div>
    `;
}

// ── Panel: Conteúdo (Textos, FAQ, Processo)
function buildConteudoPanel(container) {
    const t = siteData.texts || {};
    const faq = siteData.faq ? (siteData.faq.items || []) : [];
    const proc = siteData.processo ? (siteData.processo.items || []) : [];

    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-conteudo">
            <div class="card">
                <div class="card-header"><h3>Manifesto & Textos Principais</h3></div>
                <div class="form-group">
                    <label>Tagline (aparece no Hero)</label>
                    <input type="text" id="inp-tagline" value="${escHtml(siteData.tagline || '')}">
                </div>
                <div class="form-group">
                    <label>Manifesto — Título</label>
                    <input type="text" id="inp-man-head" value="${escHtml(siteData.manifesto ? siteData.manifesto.headline : '')}">
                </div>
                <div class="form-group">
                    <label>Manifesto — Corpo</label>
                    <textarea id="inp-man-body">${escHtml(siteData.manifesto ? siteData.manifesto.body : '')}</textarea>
                </div>
                <div class="form-group">
                    <label>Frase principal do rodapé (CTA)</label>
                    <input type="text" id="inp-cta-headline" value="${escHtml((siteData.cta || {}).headline || '')}">
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Títulos das Seções</h3></div>
                <div class="form-group">
                    <label>Título: Materialidade (Ex: MATERIALIDADE)</label>
                    <input type="text" id="inp-txt-materialidade" value="${escHtml(t.materialidadeTitle || 'MATERIALIDADE')}">
                </div>
                <div class="form-group">
                    <label>Título: Parceiros (Ex: Parceiros)</label>
                    <input type="text" id="inp-txt-parceiros" value="${escHtml(t.parceirosTitle || 'Parceiros')}">
                </div>
                <div class="form-group">
                    <label>Título: FAQ (Ex: Perguntas Frequentes)</label>
                    <input type="text" id="inp-txt-faq" value="${escHtml(t.faqTitle || 'Perguntas Frequentes')}">
                </div>
                <div class="form-group">
                    <label>Texto Subtítulo (Entre Manifesto e Footer):</label>
                    <input type="text" id="inp-txt-midcta" value="${escHtml(t.midCta || '17 anos criando ambientes únicos')}">
                </div>
            </div>

            <!-- FAQ SECTION -->
            <div class="card">
                <div class="card-header">
                    <h3>Perguntas Frequentes (FAQ)</h3>
                    <button class="btn btn-sm" onclick="addFaqItem()">+ Adicionar Pergunta</button>
                </div>
                <div id="faq-list">
                    ${faq.map((item, idx) => buildConfigItemRow('faq', item, idx)).join('')}
                </div>
            </div>

            <!-- PROCESSO SECTION -->
            <div class="card">
                <div class="card-header">
                    <h3>O Nosso Processo (Etapas)</h3>
                    <button class="btn btn-sm" onclick="addProcessoItem()">+ Adicionar Etapa</button>
                </div>
                <div class="form-group">
                    <label>Título da Seção de Processo (Ex: O Nosso Processo)</label>
                    <input type="text" id="inp-txt-processo" value="${escHtml(t.processoTitle || 'O Nosso Processo')}">
                </div>
                <div id="processo-list">
                    ${proc.map((item, idx) => buildConfigItemRow('processo', item, idx)).join('')}
                </div>
            </div>
        </div>
    `);
}

// Custom Config Item Row for FAQ / Processo
function buildConfigItemRow(type, item, idx) {
    if (type === 'faq') {
        return `
            <div class="item-row is-faq" draggable="true" data-idx="${idx}" data-section="faq">
                <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                    <input type="text" placeholder="Pergunta" value="${escHtml(item.q || '')}" onchange="updateConfigItem('faq', ${idx}, 'q', this.value)">
                    <textarea placeholder="Resposta" onchange="updateConfigItem('faq', ${idx}, 'a', this.value)" rows="3" style="width:100%; border:1px solid var(--border);border-radius:4px;padding:8px;">${escHtml(item.a || '')}</textarea>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteConfigItem('faq', ${idx})">✕</button>
            </div>
        `;
    }
    if (type === 'processo') {
        return `
            <div class="item-row is-processo" draggable="true" data-idx="${idx}" data-section="processo">
                <div style="width:60px;">
                    <input type="text" placeholder="01" value="${escHtml(item.num || '')}" onchange="updateConfigItem('processo', ${idx}, 'num', this.value)">
                </div>
                <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                    <input type="text" placeholder="Nome da Faze (ex: Escuta)" value="${escHtml(item.title || '')}" onchange="updateConfigItem('processo', ${idx}, 'title', this.value)">
                    <textarea placeholder="Pequena descrição (Opcional)" onchange="updateConfigItem('processo', ${idx}, 'desc', this.value)" rows="2" style="width:100%; border:1px solid var(--border);border-radius:4px;padding:8px;">${escHtml(item.desc || '')}</textarea>
                </div>
                <button class="btn btn-sm btn-danger" onclick="deleteConfigItem('processo', ${idx})">✕</button>
            </div>
        `;
    }
    return '';
}

// ── Panel: Config (whatsapp, instagram, cta)
function buildConfigPanel(container) {
    const cta = siteData.cta || {};
    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-config">
            <div class="card">
                <div class="card-header"><h3>WhatsApp & Contato</h3></div>
                <div class="form-group">
                    <label>Número com DDI + DDD (ex: 5511965665065)</label>
                    <input type="text" id="inp-whatsapp" value="${escHtml(cta.whatsapp || '')}">
                </div>
                <div class="form-group">
                    <label>@ do Instagram (sem o @)</label>
                    <input type="text" id="inp-instagram" value="${escHtml(cta.instagram || '')}">
                </div>
            </div>
        </div>
    `);
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────

function activatePanel(target) {
    currentPanel = target;
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-' + target);
    if (panel) panel.classList.add('active');

    updateSidebarActive(target);

    // topbar title
    const navEl = document.querySelector(`[data-target="${target}"]`);
    const title = navEl ? navEl.textContent.trim() : capitalize(target);
    document.getElementById('topbar-title').textContent = title;

    closeMobileMenu();
}

// ─────────────────────────────────────────────────────────────
// CATEGORY MANAGEMENT
// ─────────────────────────────────────────────────────────────

function openNewCategoryModal(e) {
    e.stopPropagation();
    document.getElementById('modal-title').textContent = 'Nova Categoria';
    document.getElementById('modal-cat-id').value = '';
    document.getElementById('modal-cat-label').value = '';
    document.getElementById('modal-overlay').classList.add('open');
    setTimeout(() => document.getElementById('modal-cat-id').focus(), 100);
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
}

async function confirmNewCategory() {
    const id = document.getElementById('modal-cat-id').value.trim().toLowerCase().replace(/\s+/g, '-');
    const label = document.getElementById('modal-cat-label').value.trim();

    if (!id || !label) { showToast('Preencha todos os campos', 'error'); return; }
    if (siteData.sections[id]) { showToast('Categoria já existe', 'error'); return; }

    siteData.sections[id] = { label, headline: '', images: [] };
    if (!siteData.sectionOrder) siteData.sectionOrder = [];
    siteData.sectionOrder.push(id);

    closeModal();
    await saveContent(false);
    rebuildAll();
    activatePanel(id);
    showToast(`Categoria "${label}" criada!`, 'success');
}

async function deleteCategory(secId) {
    const label = siteData.sections[secId]?.label || secId;
    if (!confirm(`Excluir a categoria "${label}"? As fotos serão removidas permanentemente.`)) return;

    delete siteData.sections[secId];
    siteData.sectionOrder = (siteData.sectionOrder || []).filter(s => s !== secId);

    await saveContent(false);
    rebuildAll();
    activatePanel('geral');
    showToast(`Categoria "${label}" excluída`, 'info');
}

// ─────────────────────────────────────────────────────────────
// HERO COLOR
// ─────────────────────────────────────────────────────────────

function previewHeroColor(value) {
    document.getElementById('hero-color-preview').style.background = value;
    document.getElementById('inp-hero-color-hex').value = value;
    siteData.heroBgColor = value;
}

function syncColorFromHex(value) {
    const hex = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        document.getElementById('inp-hero-color').value = hex;
        previewHeroColor(hex);
    }
}

// ─────────────────────────────────────────────────────────────
// DRAG & DROP — Gallery (imagens)
// ─────────────────────────────────────────────────────────────

function setupGalleryDrag(secId) {
    const gallery = document.getElementById(`gal-${secId}`);
    if (!gallery) return;

    let dragSrc = null;

    gallery.addEventListener('dragstart', e => {
        const card = e.target.closest('.img-card');
        if (!card) return;
        dragSrc = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    gallery.addEventListener('dragover', e => {
        e.preventDefault();
        const card = e.target.closest('.img-card');
        if (!card || card === dragSrc) return;
        gallery.querySelectorAll('.img-card').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    });

    gallery.addEventListener('dragleave', e => {
        const card = e.target.closest('.img-card');
        if (card) card.classList.remove('drag-over');
    });

    gallery.addEventListener('drop', async e => {
        e.preventDefault();
        const target = e.target.closest('.img-card');
        if (!target || target === dragSrc) return;

        const srcIdx = parseInt(dragSrc.dataset.idx);
        const tgtIdx = parseInt(target.dataset.idx);
        const images = siteData.sections[secId].images;

        // Reorder in memory
        const [moved] = images.splice(srcIdx, 1);
        images.splice(tgtIdx, 0, moved);

        try {
            await saveContent(false);
        } catch (err) {
            // Revert in-memory reorder if save fails
            const [reverted] = images.splice(tgtIdx, 1);
            images.splice(srcIdx, 0, reverted);
            showToast('Erro ao reordenar — alteração revertida', 'error');
        }
        rebuildCurrentPanel(secId);
    });

    gallery.addEventListener('dragend', () => {
        gallery.querySelectorAll('.img-card').forEach(c => {
            c.classList.remove('dragging', 'drag-over');
        });
        dragSrc = null;
    });
}

// ─────────────────────────────────────────────────────────────
// DRAG & DROP — List items (acabamentos, parceiros)
// ─────────────────────────────────────────────────────────────

function setupListDrag(secId) {
    const list = document.getElementById(`list-${secId}`);
    if (!list) return;

    let dragSrc = null;

    list.addEventListener('dragstart', e => {
        const row = e.target.closest('.item-row');
        if (!row) return;
        dragSrc = row;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    list.addEventListener('dragover', e => {
        e.preventDefault();
        const row = e.target.closest('.item-row');
        if (!row || row === dragSrc) return;
        list.querySelectorAll('.item-row').forEach(r => r.classList.remove('drag-over'));
        row.classList.add('drag-over');
    });

    list.addEventListener('dragleave', e => {
        const row = e.target.closest('.item-row');
        if (row) row.classList.remove('drag-over');
    });

    list.addEventListener('drop', async e => {
        e.preventDefault();
        const target = e.target.closest('.item-row');
        if (!target || target === dragSrc) return;

        const srcIdx = parseInt(dragSrc.dataset.idx);
        const tgtIdx = parseInt(target.dataset.idx);
        const items = getItemList(secId);

        const [moved] = items.splice(srcIdx, 1);
        items.splice(tgtIdx, 0, moved);

        try {
            await saveContent(false);
        } catch (err) {
            const [reverted] = items.splice(tgtIdx, 1);
            items.splice(srcIdx, 0, reverted);
            showToast('Erro ao reordenar — alteração revertida', 'error');
        }
        rebuildCurrentPanel(secId);
    });

    list.addEventListener('dragend', () => {
        list.querySelectorAll('.item-row').forEach(r => {
            r.classList.remove('dragging', 'drag-over');
        });
        dragSrc = null;
    });
}

// ─────────────────────────────────────────────────────────────
// DROP ZONE (upload de fotos)
// ─────────────────────────────────────────────────────────────

function setupDropZone(section) {
    const dz = document.getElementById(`dz-${section}`);
    const fileInput = document.getElementById(`file-${section}`);
    if (!dz || !fileInput) return;

    dz.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e =>
        dz.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }, false)
    );
    ['dragenter', 'dragover'].forEach(e =>
        dz.addEventListener(e, () => dz.classList.add('dragover'), false)
    );
    ['dragleave', 'drop'].forEach(e =>
        dz.addEventListener(e, () => dz.classList.remove('dragover'), false)
    );

    dz.addEventListener('drop', e => handleFiles(e.dataTransfer.files, section), false);
    fileInput.addEventListener('change', e => handleFiles(e.target.files, section));
}

async function handleFiles(files, section) {
    if (!files || files.length === 0) return;

    const dz = document.getElementById(`dz-${section}`);
    const prog = document.getElementById(`prog-${section}`);
    const progBar = document.getElementById(`progbar-${section}`);

    dz.textContent = `⏳ Enviando ${files.length} imagem(ns)...`;
    dz.classList.add('uploading');
    if (prog) { prog.classList.add('active'); progBar.style.width = '10%'; }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('photos', files[i]);

    try {
        if (progBar) {
            setTimeout(() => progBar.style.width = '40%', 300);
            setTimeout(() => progBar.style.width = '70%', 800);
        }

        const res = await fetch(`/api/upload/${section}`, { method: 'POST', body: formData });
        const data = await res.json();

        if (progBar) progBar.style.width = '100%';

        if (data.success) {
            if (!siteData.sections[section]) siteData.sections[section] = { label: capitalize(section), images: [] };
            if (!siteData.sections[section].images) siteData.sections[section].images = [];
            const novas = data.files.map(f => ({ src: f, caption: '', position: 'center center' }));
            siteData.sections[section].images.push(...novas);
            await saveContent(false);
            setTimeout(() => {
                rebuildCurrentPanel(section);
                showToast(`${files.length} imagem(ns) enviada(s)!`, 'success');
            }, 300);
        }
    } catch (err) {
        showToast('Erro no upload', 'error');
    } finally {
        dz.textContent = '📁 Arraste fotos aqui ou clique para selecionar';
        dz.classList.remove('uploading');
        if (prog) setTimeout(() => { prog.classList.remove('active'); progBar.style.width = '0%'; }, 500);
    }
}

// ─────────────────────────────────────────────────────────────
// IMAGE ACTIONS
// ─────────────────────────────────────────────────────────────

async function deleteImage(section, imgPath) {
    if (!confirm('Apagar esta imagem?')) return;
    try {
        await fetch('/api/upload', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagePath: imgPath })
        });
        siteData.sections[section].images = siteData.sections[section].images.filter(i => (i.src || i) !== imgPath);
        await saveContent(false);
        rebuildCurrentPanel(section);
        showToast('Imagem removida', 'info');
    } catch (err) { showToast('Erro ao apagar imagem', 'error'); }
}

function updateImageField(section, index, field, value) {
    const imgArr = siteData.sections[section].images;
    if (typeof imgArr[index] === 'string') {
        imgArr[index] = { src: imgArr[index], caption: '', position: 'center center' };
    }
    imgArr[index][field] = value;
    debouncedSave();
}

// ─────────────────────────────────────────────────────────────
// ITEM ACTIONS (Acabamentos / Parceiros)
// ─────────────────────────────────────────────────────────────

function updateItemField(section, index, field, value) {
    const list = getItemList(section);
    list[index][field] = value;
    debouncedSave();
}

async function uploadItemImage(e, section, index) {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Enviando imagem...', 'info');
    const formData = new FormData();
    formData.append('photos', file);
    try {
        const res = await fetch(`/api/upload/${section}`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success && data.files.length > 0) {
            const list = getItemList(section);
            list[index].image = data.files[0];
            await saveContent(false);
            rebuildCurrentPanel(section);
            showToast('Imagem atualizada!', 'success');
        }
    } catch (err) { showToast('Erro no upload', 'error'); }
}

async function addNewItem(section) {
    const list = getItemList(section);
    list.push({ name: 'Novo Item', image: '' });
    await saveContent(false);
    rebuildCurrentPanel(section);
}

async function deleteItem(section, index) {
    if (!confirm('Remover este item?')) return;
    const list = getItemList(section);
    list.splice(index, 1);
    await saveContent(false);
    rebuildCurrentPanel(section);
    showToast('Item removido', 'info');
}

function getItemList(section) {
    if (siteData[section] && siteData[section].items) return siteData[section].items;
    return [];
}

// ─────────────────────────────────────────────────────────────
// LOGO & HERO BG
// ─────────────────────────────────────────────────────────────

async function uploadLogoGlobal(e) {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Subindo logotipo...', 'info');
    const formData = new FormData();
    formData.append('photos', file);
    try {
        const res = await fetch('/api/upload/corporativo', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success && data.files.length > 0) {
            siteData.logo = data.files[0];
            await saveContent(false);
            rebuildCurrentPanel('geral');
            showToast('Logotipo atualizado!', 'success');
        }
    } catch (err) { showToast('Erro no upload', 'error'); }
}

async function removeLogoGlobal() {
    siteData.logo = '';
    await saveContent(false);
    rebuildCurrentPanel('geral');
    showToast('Logo removido', 'info');
}

async function uploadLogoHero(e) {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Subindo logo do Hero...', 'info');
    const formData = new FormData();
    formData.append('photos', file);
    try {
        const res = await fetch('/api/upload/corporativo', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success && data.files.length > 0) {
            siteData.logoHero = data.files[0];
            await saveContent(false);
            rebuildCurrentPanel('geral');
            showToast('Logo do Hero atualizada!', 'success');
        }
    } catch (err) { showToast('Erro no upload', 'error'); }
}

async function removeLogoHero() {
    siteData.logoHero = '';
    await saveContent(false);
    rebuildCurrentPanel('geral');
    showToast('Logo do Hero removida', 'info');
}

async function uploadHeroBg(e) {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Subindo imagem de fundo...', 'info');
    const formData = new FormData();
    formData.append('photos', file);
    try {
        const res = await fetch('/api/upload/corporativo', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success && data.files.length > 0) {
            siteData.heroBg = data.files[0];
            await saveContent(false);
            rebuildCurrentPanel('hero');
            showToast('Imagem de fundo atualizada!', 'success');
        }
    } catch (err) { showToast('Erro no upload', 'error'); }
}

async function removeHeroBg() {
    siteData.heroBg = '';
    await saveContent(false);
    rebuildCurrentPanel('hero');
    showToast('Imagem de fundo removida', 'info');
}

// ─────────────────────────────────────────────────────────────
// CROP MODAL — FRAME ARRASTÁVEL (Editor de Imagem)
// ─────────────────────────────────────────────────────────────

let cropState = { secId: '', idx: -1, desk: '50% 50%', mob: '50% 50%' };
let _currentCropTab = 'desk'; // 'desk' ou 'mob'

// Aspect ratios do frame para cada formato
const CROP_RATIOS = { desk: 16/9, mob: 9/16 };

function switchCropTab(tab) {
    // Salva posição atual antes de trocar
    _currentCropTab = tab;

    const btnDesk = document.getElementById('crop-tab-desk');
    const btnMob  = document.getElementById('crop-tab-mob');
    
    if (tab === 'desk') {
        btnDesk.style.background = 'var(--noce-green)';
        btnDesk.style.color = '#fff';
        btnDesk.style.borderColor = 'var(--noce-green)';
        btnMob.style.background = 'transparent';
        btnMob.style.color = '';
        btnMob.style.borderColor = 'var(--border)';
        document.getElementById('crop-label-hint').textContent = '16:9 Desktop';
    } else {
        btnMob.style.background = 'var(--noce-green)';
        btnMob.style.color = '#fff';
        btnMob.style.borderColor = 'var(--noce-green)';
        btnDesk.style.background = 'transparent';
        btnDesk.style.color = '';
        btnDesk.style.borderColor = 'var(--border)';
        document.getElementById('crop-label-hint').textContent = '9:16 Mobile';
    }

    // Reposiciona o frame para a posição salva do tab ativo
    const pos = tab === 'desk' ? cropState.desk : cropState.mob;
    positionFrameFromPercent(pos, tab);
}

function positionFrameFromPercent(posStr, tab) {
    const frame = document.getElementById('crop-frame');
    const canvas = document.getElementById('crop-canvas-wrap');
    const img = document.getElementById('cp-full-img');
    if (!frame || !canvas || !img.naturalWidth) return;

    const canvasW = canvas.clientWidth;
    const canvasH = canvas.clientHeight || img.clientHeight;
    // Frame dimensions (fixo em vez de aspect ratio falso, refletiria o alvo centralizado)
    let fw = 60, fh = 60;

    frame.style.width  = fw + 'px';
    frame.style.height = fh + 'px';

    // parsear posStr: "50% 50%" ou "top left"
    let px = 50, py = 50;
    if (posStr) {
        if (posStr.includes('left')) px = 0;
        else if (posStr.includes('right')) px = 100;
        const pp = posStr.match(/([\d.]+)%\s+([\d.]+)%/);
        if (pp) { px = parseFloat(pp[1]); py = parseFloat(pp[2]); }
        if (posStr.includes('top')) py = 0;
        else if (posStr.includes('bottom')) py = 100;
    }

    // Converter % da imagem para px no canvas
    const maxX = canvasW - fw;
    const maxY = canvasH - fh;
    frame.style.left = Math.max(0, Math.min(maxX, (px / 100) * maxX)) + 'px';
    frame.style.top  = Math.max(0, Math.min(maxY, (py / 100) * maxY)) + 'px';
}

function frameToPercent() {
    const frame  = document.getElementById('crop-frame');
    const canvas = document.getElementById('crop-canvas-wrap');
    const fw = frame.offsetWidth, fh = frame.offsetHeight;
    const maxX = canvas.clientWidth  - fw;
    const maxY = canvas.clientHeight - fh;
    const pctX = maxX > 0 ? (parseFloat(frame.style.left) / maxX) * 100 : 50;
    const pctY = maxY > 0 ? (parseFloat(frame.style.top)  / maxY) * 100 : 50;
    return `${pctX.toFixed(1)}% ${pctY.toFixed(1)}%`;
}

let _dragListenersSetup = false;

function openCropModal(secId, idx, deskPos, mobPos) {
    if (!deskPos || deskPos === 'center center') deskPos = '50% 50%';
    if (!mobPos  || mobPos === 'center center')  mobPos  = '50% 50%';

    cropState = { secId, idx, desk: deskPos, mob: mobPos };
    _currentCropTab = 'desk';

    // Carregar imagem
    const item = siteData.sections[secId].images[idx];
    const src  = typeof item === 'string' ? item : item.src;
    const fullImg = document.getElementById('cp-full-img');
    fullImg.src = src;

    document.getElementById('crop-modal').classList.add('open');
    switchCropTab('desk');

    // Setup drag do frame (uma só vez)
    if (!_dragListenersSetup) {
        _dragListenersSetup = true;
        setupFrameDrag();
    }

    // Aguardar a imagem carregar para posicionar o frame
    if (fullImg.complete && fullImg.naturalWidth) {
        requestAnimationFrame(() => positionFrameFromPercent(cropState.desk, 'desk'));
    } else {
        fullImg.onload = () => {
            requestAnimationFrame(() => positionFrameFromPercent(cropState.desk, 'desk'));
        };
    }
}

function setupFrameDrag() {
    const frame  = document.getElementById('crop-frame');
    const canvas = document.getElementById('crop-canvas-wrap');
    let isDragging = false, startX = 0, startY = 0, startL = 0, startT = 0;

    const onDown = (cx, cy) => {
        isDragging = true;
        startX = cx; startY = cy;
        startL = parseFloat(frame.style.left) || 0;
        startT = parseFloat(frame.style.top)  || 0;
        frame.style.cursor = 'grabbing';
    };
    const onMove = (cx, cy) => {
        if (!isDragging) return;
        const fw = frame.offsetWidth, fh = frame.offsetHeight;
        const maxX = canvas.clientWidth  - fw;
        const maxY = canvas.clientHeight - fh;
        let newL = Math.max(0, Math.min(maxX, startL + (cx - startX)));
        let newT = Math.max(0, Math.min(maxY, startT + (cy - startY)));
        frame.style.left = newL + 'px';
        frame.style.top  = newT + 'px';
        // Salva em tempo real
        const pos = frameToPercent();
        cropState[_currentCropTab] = pos;
    };
    const onUp = () => { isDragging = false; frame.style.cursor = 'move'; };

    frame.addEventListener('mousedown',  e => { e.preventDefault(); onDown(e.clientX, e.clientY); });
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup',   onUp);

    frame.addEventListener('touchstart', e => { e.preventDefault(); onDown(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    window.addEventListener('touchmove', e => { if (isDragging) { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }}, { passive: false });
    window.addEventListener('touchend',  onUp);
}

function closeCropModal() {
    document.getElementById('crop-modal').classList.remove('open');
}

async function confirmCrop() {
    const { secId, idx, desk, mob } = cropState;
    if (idx === -1) return;

    const imgArr = siteData.sections[secId].images;
    if (typeof imgArr[idx] === 'string') {
        imgArr[idx] = { src: imgArr[idx], caption: '', positionDesktop: desk, positionMobile: mob };
    } else {
        imgArr[idx].positionDesktop = desk;
        imgArr[idx].positionMobile  = mob;
    }

    await saveContent(false);
    rebuildCurrentPanel(secId);
    closeCropModal();
    showToast('Enquadramento salvo!', 'success');
}

// Drag setup é feito em openCropModal via setupFrameDrag()

// ─────────────────────────────────────────────────────────────
// SAVE
// ─────────────────────────────────────────────────────────────

async function saveContent(showMsg = true) {
    updateSaveStatus('saving');

    // Collect editable fields from DOM
    const tagline = document.getElementById('inp-tagline');
    if (tagline) siteData.tagline = tagline.value;

    if (!siteData.manifesto) siteData.manifesto = {};
    const manHead = document.getElementById('inp-man-head');
    if (manHead) siteData.manifesto.headline = manHead.value;
    const manBody = document.getElementById('inp-man-body');
    if (manBody) siteData.manifesto.body = manBody.value;

    // Collect hero color
    const heroColor = document.getElementById('inp-hero-color');
    if (heroColor) siteData.heroBgColor = heroColor.value;

    // Collect hero logo size
    const heroLogoSizeDesktop = document.getElementById('inp-hero-logo-size-desktop');
    if (heroLogoSizeDesktop) siteData.heroLogoSizeDesktop = heroLogoSizeDesktop.value;

    const heroLogoSizeMobile = document.getElementById('inp-hero-logo-size-mobile');
    if (heroLogoSizeMobile) siteData.heroLogoSizeMobile = heroLogoSizeMobile.value;

    // Collect labels for all sections
    const order = siteData.sectionOrder || Object.keys(siteData.sections);
    order.forEach(secId => {
        const labelEl = document.getElementById(`inp-${secId}-label`);
        if (labelEl && siteData.sections[secId]) {
            siteData.sections[secId].label = labelEl.value;
        }
    });

    // Acabamentos / Parceiros headlines
    ['acabamentos', 'parceiros'].forEach(s => {
        const el = document.getElementById(`inp-${s}-head`);
        if (el) {
            if (!siteData[s]) siteData[s] = {};
            siteData[s].headline = el.value;
        }
    });

    // Config fields
    if (!siteData.cta) siteData.cta = {};
    const whats = document.getElementById('inp-whatsapp');
    if (whats) siteData.cta.whatsapp = whats.value;
    const insta = document.getElementById('inp-instagram');
    if (insta) siteData.cta.instagram = insta.value;
    const ctaH = document.getElementById('inp-cta-headline');
    if (ctaH) siteData.cta.headline = ctaH.value;

    // Conteudos fields (Texts)
    if (!siteData.texts) siteData.texts = {};
    const tFields = [
        {id: 'inp-txt-materialidade', key: 'materialidadeTitle'},
        {id: 'inp-txt-parceiros', key: 'parceirosTitle'},
        {id: 'inp-txt-faq', key: 'faqTitle'},
        {id: 'inp-txt-processo', key: 'processoTitle'},
        {id: 'inp-txt-midcta', key: 'midCta'}
    ];
    tFields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) siteData.texts[f.key] = el.value;
    });

    try {
        const res = await fetch('/api/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(siteData)
        });
        if (!res.ok) throw new Error('Save failed');
        updateSaveStatus('saved');
        if (showMsg) showToast('Salvo com sucesso!', 'success');
    } catch (err) {
        updateSaveStatus('error');
        showToast('Erro ao salvar', 'error');
    }
}

// ─────────────────────────────────────────────────────────────
// CONTEUDO ACTIONS (FAQ & Processo)
// ─────────────────────────────────────────────────────────────

async function addFaqItem() {
    if (!siteData.faq) siteData.faq = { items: [] };
    if (!siteData.faq.items) siteData.faq.items = [];
    siteData.faq.items.push({ q: 'Nova Pergunta', a: 'Resposta...' });
    await saveContent(false);
    rebuildCurrentPanel('conteudo');
}

async function addProcessoItem() {
    if (!siteData.processo) siteData.processo = { items: [] };
    if (!siteData.processo.items) siteData.processo.items = [];
    siteData.processo.items.push({ num: '0' + (siteData.processo.items.length + 1), title: 'Nova Etapa', desc: '' });
    await saveContent(false);
    rebuildCurrentPanel('conteudo');
}

function updateConfigItem(section, index, field, value) {
    if (siteData[section] && siteData[section].items && siteData[section].items[index]) {
        siteData[section].items[index][field] = value;
        debouncedSave();
    }
}

async function deleteConfigItem(section, index) {
    if (!confirm('Remover este item?')) return;
    if (siteData[section] && siteData[section].items) {
        siteData[section].items.splice(index, 1);
        await saveContent(false);
        rebuildCurrentPanel('conteudo');
        showToast('Item removido', 'info');
    }
}

// ─────────────────────────────────────────────────────────────
// HELPERS & REBUILD
// ─────────────────────────────────────────────────────────────

function rebuildAll() {
    renderSidebar();
    buildPanels();
}

function rebuildCurrentPanel(section) {
    rebuildAll();
    setTimeout(() => activatePanel(section), 10);
}

function setupMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay-bg');

    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay-bg').classList.remove('active');
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    t.textContent = `${icons[type] || '✅'} ${msg}`;
    t.className = `toast ${type}`;
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.style.display = 'none', 3000);
}

function updateSaveStatus(state) {
    const el = document.getElementById('save-status');
    if (!el) return;
    const dot = el.querySelector('.dot');
    const text = el.querySelector('span:last-child');
    if (state === 'saving') {
        dot.className = 'dot saving'; text.textContent = 'Salvando...';
    } else if (state === 'saved') {
        dot.className = 'dot saved'; text.textContent = 'Salvo';
    } else {
        dot.className = 'dot'; dot.style.background = '#c0392b'; text.textContent = 'Erro';
    }
}

function escHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─────────────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────────────
function iconGear()      { return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>`; }
function iconImage()     { return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`; }
function iconSettings()  { return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.484.484 0 0 0 14 2h-4c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`; }
function iconRooms()     { return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L2 12h3v9h6v-5h2v5h6v-9h3L12 3z"/></svg>`; }
function iconRoom()      { return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>`; }
function iconPalette()   { return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 22C6.49 22 2 17.51 2 12S6.49 2 12 2s10 4.04 10 9c0 3.31-2.69 6-6 6h-1.77c-.28 0-.5.22-.5.5 0 .12.05.23.13.33.41.47.64 1.06.64 1.67A2.5 2.5 0 0 1 12 22z"/></svg>`; }
function iconPartners()  { return `<svg fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`; }
function iconChevron()   { return `<svg class="chevron" fill="currentColor" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>`; }
