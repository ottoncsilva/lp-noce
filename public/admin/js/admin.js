// ============================================================
// NOCE MOBILI — Admin JS
// Versão: 2.0 — Gestão dinâmica + Drag & Drop + Color Picker
// ============================================================

let siteData = {};
let currentPanel = 'geral';

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
        if (!res.ok) throw new Error('Network error');
        siteData = await res.json();

        // Garante estrutura sections
        if (!siteData.sections) siteData.sections = {};

        // Garante que cada seção padrão existe
        DEFAULT_SECTIONS.forEach(s => {
            if (!siteData.sections[s]) {
                siteData.sections[s] = { label: capitalize(s), headline: '', images: [] };
            }
        });

        // Garante section customizada — mantém categorias extras
        if (!siteData.sectionOrder) {
            siteData.sectionOrder = Object.keys(siteData.sections);
        }

        if (!siteData.acabamentos) siteData.acabamentos = { headline: '', items: [] };
        if (!siteData.parceiros)   siteData.parceiros   = { headline: '', items: [] };
        if (!siteData.cta)         siteData.cta         = {};

    } catch(err) {
        showToast("Erro ao carregar dados", "error");
    }
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR — dinâmica com submenu de ambientes
// ─────────────────────────────────────────────────────────────

function renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    const order = siteData.sectionOrder || Object.keys(siteData.sections);

    nav.innerHTML = `
        <div class="nav-section-title">Configuração</div>
        <button class="nav-item" data-target="geral" onclick="activatePanel('geral')">
            ${iconGear()}
            Geral
        </button>
        <button class="nav-item" data-target="hero" onclick="activatePanel('hero')">
            ${iconImage()}
            Hero
        </button>
        <button class="nav-item" data-target="config" onclick="activatePanel('config')">
            ${iconSettings()}
            Configurações
        </button>

        <div class="nav-section-title" style="margin-top:0.5rem;">Ambientes</div>
        <div class="nav-group ${order.some(s => siteData.sections[s]) ? 'open' : 'open'}" id="nav-group-ambientes">
            <button class="nav-group-toggle" onclick="toggleNavGroup('nav-group-ambientes')">
                <span class="toggle-left">
                    ${iconRooms()}
                    Ambientes
                </span>
                <span style="display:flex;align-items:center;gap:6px;">
                    <button class="btn-add-cat" onclick="openNewCategoryModal(event)" title="Nova categoria">+</button>
                    ${iconChevron()}
                </span>
            </button>
            <div class="nav-submenu" id="submenu-ambientes">
                ${order.map(secId => {
                    if (!siteData.sections[secId]) return '';
                    const label = siteData.sections[secId].label || capitalize(secId);
                    return `
                        <button class="nav-sub-item" data-target="${secId}" onclick="activatePanel('${secId}')">
                            ${iconRoom()}
                            ${escHtml(label)}
                        </button>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="nav-section-title" style="margin-top:0.5rem;">Catálogo</div>
        <button class="nav-item" data-target="acabamentos" onclick="activatePanel('acabamentos')">
            ${iconPalette()}
            Acabamentos
        </button>
        <button class="nav-item" data-target="parceiros" onclick="activatePanel('parceiros')">
            ${iconPartners()}
            Parceiros
        </button>
    `;
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

// ── Panel: Geral (textos manifesto + logotipo)
function buildGeralPanel(container) {
    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-geral">
            <div class="card">
                <div class="card-header">
                    <h3>Logotipo</h3>
                </div>
                <p style="font-size:0.8rem;color:var(--text-light);margin-bottom:1rem;">Use PNG com fundo transparente para melhor resultado.</p>
                <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
                    ${siteData.logo
                        ? `<img src="${siteData.logo}" style="height:50px;background:#233728;padding:8px;border-radius:4px;" alt="Logo">`
                        : `<span style="color:#999;font-size:0.85rem;">Nenhum logo enviado</span>`}
                    <input type="file" id="file-logo" accept="image/*" style="display:none" onchange="uploadLogoGlobal(event)">
                    <button class="btn btn-sm" onclick="document.getElementById('file-logo').click()">Upload Logo</button>
                    ${siteData.logo ? `<button class="btn btn-sm btn-danger" onclick="removeLogoGlobal()">Remover</button>` : ''}
                </div>
            </div>

            <div class="card">
                <div class="card-header"><h3>Textos Manifesto</h3></div>
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
    const pos = typeof imgObj === 'object' ? (imgObj.position || 'center center') : 'center center';

    const posOptions = POSITION_OPTIONS.map(o =>
        `<option value="${o.value}" ${pos === o.value ? 'selected' : ''}>${o.label}</option>`
    ).join('');

    return `
        <div class="img-card" draggable="true" data-idx="${idx}" data-section="${secId}">
            <span class="drag-handle" title="Arrastar">⠿</span>
            <img src="${escHtml(src)}" alt="Imagem ${idx+1}">
            <button class="btn-delete-img" onclick="deleteImage('${secId}', '${escHtml(src)}')" title="Apagar">✕</button>
            <div class="img-card-meta">
                <input type="text" placeholder="Legenda..." value="${escHtml(cap)}"
                    onchange="updateImageField('${secId}', ${idx}, 'caption', this.value)">
                <select onchange="updateImageField('${secId}', ${idx}, 'position', this.value)" title="Enquadramento Mobile">
                    ${posOptions}
                </select>
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
            <div class="card">
                <div class="card-header"><h3>Call to Action</h3></div>
                <div class="form-group">
                    <label>Frase principal do rodapé</label>
                    <input type="text" id="inp-cta-headline" value="${escHtml(cta.headline || '')}">
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

        // Reorder
        const [moved] = images.splice(srcIdx, 1);
        images.splice(tgtIdx, 0, moved);

        await saveContent(false);
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

        await saveContent(false);
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

async function updateImageField(section, index, field, value) {
    const imgArr = siteData.sections[section].images;
    if (typeof imgArr[index] === 'string') {
        imgArr[index] = { src: imgArr[index], caption: '', position: 'center center' };
    }
    imgArr[index][field] = value;
    await saveContent(false);
}

// ─────────────────────────────────────────────────────────────
// ITEM ACTIONS (Acabamentos / Parceiros)
// ─────────────────────────────────────────────────────────────

async function updateItemField(section, index, field, value) {
    const list = getItemList(section);
    list[index][field] = value;
    await saveContent(false);
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
