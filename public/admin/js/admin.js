let siteData = {};

document.addEventListener("DOMContentLoaded", async () => {
    await fetchContent();
    buildUI();
    setupNav();
    setupMobileMenu();
});

async function fetchContent() {
    try {
        const res = await fetch('/api/content');
        if (!res.ok) throw new Error('Network error');
        siteData = await res.json();
    } catch(err) {
        showToast("Erro ao carregar dados", "error");
    }
}

function buildUI() {
    const container = document.getElementById('panels-container');
    container.innerHTML = '';

    // === GERAL PANEL ===
    container.insertAdjacentHTML('beforeend', `
        <div class="panel active" id="panel-geral">
            <div class="card">
                <h3>Logotipo Oficial</h3>
                <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                    ${siteData.logo ? `<img src="${siteData.logo}" style="height:50px; background:#233728; padding:8px; border-radius:4px;">` : '<span style="color:#999; font-size:0.85rem;">Nenhum logo enviado</span>'}
                    <input type="file" id="file-logo" accept="image/*" style="display:none" onchange="uploadLogoGlobal(event)">
                    <button class="btn btn-sm" onclick="document.getElementById('file-logo').click()">Upload Logo</button>
                    ${siteData.logo ? `<button class="btn btn-sm btn-danger" onclick="removeLogoGlobal()">Remover</button>` : ''}
                </div>
            </div>

            <div class="card">
                <h3>Textos Principais</h3>
                <div class="form-group">
                    <label>Tagline (Hero)</label>
                    <input type="text" id="inp-tagline" value="${siteData.tagline || ''}">
                </div>
                <div class="form-group">
                    <label>Manifesto — Título</label>
                    <input type="text" id="inp-man-head" value="${siteData.manifesto ? siteData.manifesto.headline : ''}">
                </div>
                <div class="form-group">
                    <label>Manifesto — Corpo</label>
                    <textarea id="inp-man-body">${siteData.manifesto ? siteData.manifesto.body : ''}</textarea>
                </div>
            </div>
        </div>
    `);

    // === AMBIENTES PANELS ===
    const ambSections = ['cozinha', 'living', 'closet', 'banheiro', 'corporativo'];
    ambSections.forEach(secName => {
        const sec = siteData.sections ? siteData.sections[secName] : null;
        if(!sec) return;
        buildAmbientePanel(container, secName, sec);
    });

    // === ACABAMENTOS PANEL ===
    const acab = siteData.acabamentos || (siteData.sections ? siteData.sections.acabamentos : null);
    if(acab) buildListPanel(container, 'acabamentos', acab);

    // === PARCEIROS PANEL ===
    const parc = siteData.parceiros || (siteData.sections ? siteData.sections.parceiros : null);
    if(parc) buildListPanel(container, 'parceiros', parc);

    // === CONFIG PANEL ===
    buildConfigPanel(container);
}

function buildAmbientePanel(container, secName, sec) {
    const images = sec.images || [];
    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-${secName}">
            <div class="card">
                <h3>Informações</h3>
                <div class="form-group">
                    <label>Título da Seção</label>
                    <input type="text" id="inp-${secName}-head" value="${sec.headline || ''}">
                </div>
            </div>

            <div class="card">
                <h3>Galeria de Imagens</h3>
                <div class="drop-zone" id="dz-${secName}">
                    📁 Arraste fotos aqui ou clique para selecionar
                </div>
                <div class="upload-progress" id="prog-${secName}">
                    <div class="upload-progress-bar" id="progbar-${secName}"></div>
                </div>
                <input type="file" id="file-${secName}" multiple accept="image/*" style="display:none">
                <div class="gallery-preview" id="gal-${secName}">
                    ${images.map((imgObj, idx) => {
                        const src = typeof imgObj === 'string' ? imgObj : imgObj.src;
                        const cap = typeof imgObj === 'object' ? (imgObj.caption || '') : '';
                        return `
                        <div class="img-card">
                            <img src="${src}" alt="Imagem ${idx+1}">
                            <button class="btn-delete-img" onclick="deleteImage('${secName}', '${src}')" title="Apagar">✕</button>
                            <input type="text" placeholder="Legenda..." value="${cap}" onchange="updateCaption('${secName}', ${idx}, this.value)">
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>
    `);
    setupDropZone(secName);
}

function buildListPanel(container, secName, sec) {
    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-${secName}">
            <div class="card">
                <h3>Informações</h3>
                <div class="form-group">
                    <label>Título da Seção</label>
                    <input type="text" id="inp-${secName}-head" value="${sec.headline || ''}">
                </div>
            </div>

            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3 style="margin:0; border:0; padding:0;">Itens</h3>
                    <button class="btn btn-sm" onclick="addNewItem('${secName}')">+ ADICIONAR</button>
                </div>
                <div id="list-${secName}">
                    ${(sec.items || []).map((item, idx) => `
                        <div class="item-row">
                            <input type="text" value="${item.name}" onchange="updateItemName('${secName}', ${idx}, this.value)" placeholder="Nome" style="flex:1;">
                            ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ''}
                            <input type="file" id="fi-${secName}-${idx}" accept="image/*" style="display:none" onchange="uploadItemImage(event, '${secName}', ${idx})">
                            <button class="btn btn-sm btn-outline-dark" onclick="document.getElementById('fi-${secName}-${idx}').click()">Upload</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteItem('${secName}', ${idx})">✕</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `);
}

function buildConfigPanel(container) {
    const cta = siteData.cta || {};
    container.insertAdjacentHTML('beforeend', `
        <div class="panel" id="panel-config">
            <div class="card">
                <h3>WhatsApp</h3>
                <div class="form-group">
                    <label>Número com DDI + DDD (ex: 5511965665065)</label>
                    <input type="text" id="inp-whatsapp" value="${cta.whatsapp || ''}">
                </div>
            </div>

            <div class="card">
                <h3>Instagram</h3>
                <div class="form-group">
                    <label>@ do perfil (sem o @)</label>
                    <input type="text" id="inp-instagram" value="${cta.instagram || ''}">
                </div>
            </div>

            <div class="card">
                <h3>Call to Action</h3>
                <div class="form-group">
                    <label>Frase Principal do Rodapé</label>
                    <input type="text" id="inp-cta-headline" value="${cta.headline || ''}">
                </div>
            </div>

            <div class="card">
                <h3>Imagem de Fundo do Hero</h3>
                <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                    ${siteData.heroBg ? `<img src="${siteData.heroBg}" style="height:60px; border-radius:4px;">` : '<span style="color:#999; font-size:0.85rem;">Placeholder padrão</span>'}
                    <input type="file" id="file-hero-bg" accept="image/*" style="display:none" onchange="uploadHeroBg(event)">
                    <button class="btn btn-sm" onclick="document.getElementById('file-hero-bg').click()">Upload Novo Fundo</button>
                </div>
            </div>
        </div>
    `);
}

// === NAVIGATION ===
function setupNav() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

            item.classList.add('active');
            const target = item.getAttribute('data-target');
            const panel = document.getElementById('panel-' + target);
            if(panel) panel.classList.add('active');

            document.getElementById('topbar-title').textContent = item.textContent.trim();

            // Close mobile menu
            closeMobileMenu();
        });
    });
}

// === MOBILE MENU ===
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

// === DROP ZONE ===
function setupDropZone(section) {
    const dz = document.getElementById(`dz-${section}`);
    const fileInput = document.getElementById(`file-${section}`);
    if(!dz || !fileInput) return;

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

    dz.addEventListener('drop', (e) => handleDrop(e, section), false);
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files, section));
}

function handleDrop(e, section) {
    handleFiles(e.dataTransfer.files, section);
}

async function handleFiles(files, section) {
    if(!files || files.length === 0) return;
    const formData = new FormData();
    for(let i = 0; i < files.length; i++) formData.append('photos', files[i]);

    const dz = document.getElementById(`dz-${section}`);
    const prog = document.getElementById(`prog-${section}`);
    const progBar = document.getElementById(`progbar-${section}`);
    
    dz.textContent = `⏳ Enviando ${files.length} imagem(ns)...`;
    dz.classList.add('uploading');
    
    // Show progress bar
    if(prog) {
        prog.classList.add('active');
        progBar.style.width = '10%';
    }

    try {
        // Simulate progress
        if(progBar) {
            setTimeout(() => progBar.style.width = '40%', 300);
            setTimeout(() => progBar.style.width = '70%', 800);
        }
        
        const res = await fetch(`/api/upload/${section}`, { method: 'POST', body: formData });
        const data = await res.json();
        
        if(progBar) progBar.style.width = '100%';
        
        if(data.success) {
            if(!siteData.sections[section].images) siteData.sections[section].images = [];
            const novas = data.files.map(f => ({src: f, caption: ''}));
            siteData.sections[section].images.push(...novas);
            await saveContent(false);
            
            setTimeout(() => {
                rebuildCurrentPanel(section);
                showToast(`${files.length} imagem(ns) enviada(s)!`, "success");
            }, 300);
        }
    } catch(err) { 
        showToast("Erro no upload", "error");
    }
    finally { 
        dz.textContent = "📁 Arraste fotos aqui ou clique para selecionar";
        dz.classList.remove('uploading');
        if(prog) {
            setTimeout(() => {
                prog.classList.remove('active');
                progBar.style.width = '0%';
            }, 500);
        }
    }
}

// === IMAGE & ITEM ACTIONS ===
async function deleteImage(section, imgPath) {
    if(!confirm("Apagar esta imagem?")) return;
    try {
        await fetch('/api/upload', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ imagePath: imgPath })
        });
        siteData.sections[section].images = siteData.sections[section].images.filter(i => (i.src || i) !== imgPath);
        await saveContent(false);
        rebuildCurrentPanel(section);
        showToast("Imagem removida", "info");
    } catch(err) { showToast("Erro ao apagar imagem", "error"); }
}

async function updateCaption(section, index, value) {
    siteData.sections[section].images[index].caption = value;
    await saveContent(false);
}

async function updateItemName(section, index, value) {
    const list = getItemList(section);
    list[index].name = value;
    await saveContent(false);
}

async function updateItemImage(section, index, value) {
    const list = getItemList(section);
    list[index].image = value;
    await saveContent(false);
}

async function uploadItemImage(e, section, index) {
    const file = e.target.files[0];
    if(!file) return;
    showToast("Enviando imagem...", "info");
    const formData = new FormData();
    formData.append('photos', file);
    try {
        const res = await fetch(`/api/upload/${section}`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success && data.files.length > 0) {
            const list = getItemList(section);
            list[index].image = data.files[0];
            await saveContent(false);
            rebuildCurrentPanel(section);
            showToast("Imagem atualizada!", "success");
        }
    } catch(err) { showToast("Erro no upload", "error"); }
}

async function addNewItem(section) {
    const list = getItemList(section);
    list.push({ name: "Novo Item", image: "" });
    await saveContent(false);
    rebuildCurrentPanel(section);
}

async function deleteItem(section, index) {
    if(!confirm("Remover este item?")) return;
    const list = getItemList(section);
    list.splice(index, 1);
    await saveContent(false);
    rebuildCurrentPanel(section);
    showToast("Item removido", "info");
}

function getItemList(section) {
    if(siteData.sections && siteData.sections[section] && siteData.sections[section].items) {
        return siteData.sections[section].items;
    }
    if(siteData[section] && siteData[section].items) {
        return siteData[section].items;
    }
    return [];
}

// === LOGO ===
async function uploadLogoGlobal(e) {
    const file = e.target.files[0];
    if(!file) return;
    showToast("Subindo logotipo...", "info");
    const formData = new FormData();
    formData.append('photos', file);
    try {
        const res = await fetch('/api/upload/corporativo', { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success && data.files.length > 0) {
            siteData.logo = data.files[0];
            await saveContent(false);
            rebuildCurrentPanel('geral');
            showToast("Logotipo atualizado!", "success");
        }
    } catch(err) { showToast("Erro no upload", "error"); }
}

async function removeLogoGlobal() {
    siteData.logo = "";
    await saveContent(false);
    rebuildCurrentPanel('geral');
    showToast("Logo removido", "info");
}

// === HERO BG ===
async function uploadHeroBg(e) {
    const file = e.target.files[0];
    if(!file) return;
    showToast("Subindo imagem de fundo...", "info");
    const formData = new FormData();
    formData.append('photos', file);
    try {
        const res = await fetch('/api/upload/corporativo', { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success && data.files.length > 0) {
            siteData.heroBg = data.files[0];
            await saveContent(false);
            rebuildCurrentPanel('config');
            showToast("Imagem de fundo atualizada!", "success");
        }
    } catch(err) { showToast("Erro no upload", "error"); }
}

// === SAVE ===
async function saveContent(showMsg = true) {
    // Update save status
    updateSaveStatus('saving');
    
    // Collect editable fields
    const tagline = document.getElementById('inp-tagline');
    if(tagline) siteData.tagline = tagline.value;

    const manHead = document.getElementById('inp-man-head');
    if(manHead && siteData.manifesto) siteData.manifesto.headline = manHead.value;

    const manBody = document.getElementById('inp-man-body');
    if(manBody && siteData.manifesto) siteData.manifesto.body = manBody.value;

    const sectionsToSave = ['cozinha', 'living', 'closet', 'banheiro', 'corporativo', 'acabamentos', 'parceiros'];
    sectionsToSave.forEach(s => {
        const el = document.getElementById(`inp-${s}-head`);
        if(el && siteData.sections && siteData.sections[s]) siteData.sections[s].headline = el.value;
        if(el && siteData[s]) siteData[s].headline = el.value;
    });

    // Config fields
    const whats = document.getElementById('inp-whatsapp');
    if(whats) { if(!siteData.cta) siteData.cta = {}; siteData.cta.whatsapp = whats.value; }
    
    const insta = document.getElementById('inp-instagram');
    if(insta) { if(!siteData.cta) siteData.cta = {}; siteData.cta.instagram = insta.value; }
    
    const ctaH = document.getElementById('inp-cta-headline');
    if(ctaH) { if(!siteData.cta) siteData.cta = {}; siteData.cta.headline = ctaH.value; }

    try {
        const res = await fetch('/api/content', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(siteData)
        });
        if(!res.ok) throw new Error('Save failed');
        updateSaveStatus('saved');
        if(showMsg) showToast("Salvo com sucesso!", "success");
    } catch(err) { 
        updateSaveStatus('error');
        showToast("Erro ao salvar", "error");
    }
}

// === HELPERS ===
function rebuildCurrentPanel(section) {
    buildUI();
    setupNav();
    const navItem = document.querySelector(`.nav-item[data-target="${section}"]`);
    if(navItem) navItem.click();
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    t.textContent = `${icons[type] || '✅'} ${msg}`;
    t.className = `toast ${type}`;
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}

function updateSaveStatus(state) {
    const el = document.getElementById('save-status');
    if(!el) return;
    const dot = el.querySelector('.dot');
    const text = el.querySelector('span:last-child');
    
    if(state === 'saving') {
        dot.className = 'dot saving';
        text.textContent = 'Salvando...';
    } else if(state === 'saved') {
        dot.className = 'dot saved';
        text.textContent = 'Salvo';
    } else {
        dot.className = 'dot';
        dot.style.background = '#c0392b';
        text.textContent = 'Erro';
    }
}
