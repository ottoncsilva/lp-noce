let siteData = {};

document.addEventListener("DOMContentLoaded", async () => {
    await fetchContent();
    buildUI();
    setupTabs();
});

async function fetchContent() {
    const res = await fetch('/api/content');
    siteData = await res.json();
}

function buildUI() {
    const container = document.getElementById('panels-container');
    container.innerHTML = '';

    // GERAL PANEL
    container.insertAdjacentHTML('beforeend', `
        <div class="panel active" id="panel-geral">
            <h3>Textos Principais</h3>
            <div class="form-group">
                <label>Tagline (Hero)</label>
                <input type="text" id="inp-tagline" value="${siteData.tagline}">
            </div>
            <div class="form-group">
                <label>Manifesto Título</label>
                <input type="text" id="inp-man-head" value="${siteData.manifesto.headline}">
            </div>
            <div class="form-group">
                <label>Manifesto Corpo</label>
                <textarea id="inp-man-body">${siteData.manifesto.body}</textarea>
            </div>
        </div>
    `);

    // AMBIENTES PANELS
    const sections = ['cozinha', 'living', 'closet', 'banheiro', 'corporativo', 'acabamentos', 'parceiros'];
    sections.forEach(secName => {
        const sec = siteData.sections[secName] || siteData[secName];
        if(!sec) return;

        let hasImages = sec.images !== undefined;
        let isList = sec.items !== undefined;
        let imagesArray = hasImages ? sec.images : [];

        const html = `
            <div class="panel" id="panel-${secName}">
                <h3>${sec.label || secName.toUpperCase()}</h3>
                <div class="form-group">
                    <label>Título da Seção</label>
                    <input type="text" id="inp-${secName}-head" value="${sec.headline || ''}">
                </div>
                
                ${hasImages ? `
                <div class="form-group">
                    <label>Galeria de Imagens (Arraste múltiplas fotos ou clique)</label>
                    <div class="drop-zone" id="dz-${secName}">Solte fotos aqui para Upload</div>
                    <input type="file" id="file-${secName}" multiple accept="image/*" style="display:none">
                    
                    <div class="gallery-preview" id="gal-${secName}">
                        ${imagesArray.map((imgObj, idx) => `
                            <div class="img-card" style="display:flex;flex-direction:column;gap:5px;">
                                <img src="${imgObj.src || imgObj}" style="width:100%; height:150px; object-fit:cover;">
                                <input type="text" placeholder="Legenda (opcional)" value="${imgObj.caption || ''}" onchange="updateCaption('${secName}', ${idx}, this.value)" style="padding:5px; font-size:12px;">
                                <button class="btn-delete" onclick="deleteImage('${secName}', '${imgObj.src || imgObj}')">X</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                ${isList ? `
                <div class="form-group">
                    <label>Itens (${secName === 'parceiros' ? 'Parceiros' : 'Acabamentos'})</label>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${sec.items.map((item, idx) => `
                            <div style="border:1px solid #ccc; padding:10px; display:flex; gap:10px; align-items:center;">
                                <input type="text" value="${item.name}" onchange="updateItemName('${secName}', ${idx}, this.value)" placeholder="Nome">
                                <input type="text" value="${item.image || ''}" onchange="updateItemImage('${secName}', ${idx}, this.value)" placeholder="/images/logo.png">
                            </div>
                        `).join('')}
                    </div>
                    <p style="font-size:11px; color:#666; margin-top:5px;">Por enquanto os logos dos parceiros ou fotos de materiais devem ser enviados puxando a URL da imagem. Coloque '/images/...'.</p>
                </div>
                ` : ''}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);

        if(hasImages) {
            setupDropZone(secName);
        }
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById('panel-' + tab.getAttribute('data-target')).classList.add('active');
        });
    });
}

function setupDropZone(section) {
    const dz = document.getElementById(`dz-${section}`);
    const fileInput = document.getElementById(`file-${section}`);

    dz.addEventListener('click', () => fileInput.click());
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dz.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(eventName => {
        dz.addEventListener(eventName, () => dz.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dz.addEventListener(eventName, () => dz.classList.remove('dragover'), false);
    });

    dz.addEventListener('drop', (e) => handleDrop(e, section), false);
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files, section));
}

function handleDrop(e, section) {
    const dt = e.dataTransfer;
    handleFiles(dt.files, section);
}

async function handleFiles(files, section) {
    if(!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('photos', files[i]);
    }

    // Indicate loading
    document.getElementById(`dz-${section}`).textContent = "Enviando e otimizando imagens...";

    try {
        const res = await fetch(`/api/upload/${section}`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if(data.success) {
            // Update siteData and save
            if(!siteData.sections[section].images) siteData.sections[section].images = [];
            // Converta os arquivos subidos para formato obj {src, caption}
            const novasUrls = data.files.map(f => ({src: f, caption: ''}));
            siteData.sections[section].images.push(...novasUrls);
            await saveContent(false);
            buildUI();
            setupTabs();
            document.querySelector(`.tab[data-target="${section}"]`).click();
            showToast("Upload concluído!");
        }
    } catch(err) {
        alert("Erro no upload");
    } finally {
        document.getElementById(`dz-${section}`).textContent = "Solte fotos aqui para Upload";
    }
}

async function deleteImage(section, imgPath) {
    if(!confirm("Apagar esta imagem?")) return;
    
    try {
        await fetch('/api/upload', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ imagePath: imgPath })
        });
        
        // Update JSON
        siteData.sections[section].images = siteData.sections[section].images.filter(i => (i.src || i) !== imgPath);
        await saveContent(false);
        buildUI();
        setupTabs();
        document.querySelector(`.tab[data-target="${section}"]`).click();
        
    } catch(err) {
        alert("Erro ao apagar");
    }
}

async function saveContent(showMsg = true) {
    // Collect specific fields
    siteData.tagline = document.getElementById('inp-tagline').value;
    siteData.manifesto.headline = document.getElementById('inp-man-head').value;
    siteData.manifesto.body = document.getElementById('inp-man-body').value;

    const sectionsToSave = ['cozinha', 'living', 'closet', 'banheiro', 'corporativo'];
    sectionsToSave.forEach(s => {
        const el = document.getElementById(`inp-${s}-head`);
        if(el && siteData.sections[s]) siteData.sections[s].headline = el.value;
    });

    try {
        await fetch('/api/content', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(siteData)
        });
        if(showMsg) showToast("Salvo com sucesso!");
    } catch (err) {
        alert("Erro ao salvar");
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

// Funções de Update Direto no Objeto
async function updateCaption(section, index, value) {
    siteData.sections[section].images[index].caption = value;
    await saveContent(false);
}

async function updateItemName(section, index, value) {
    const list = siteData.sections[section] ? siteData.sections[section].items : siteData[section].items;
    list[index].name = value;
    await saveContent(false);
}

async function updateItemImage(section, index, value) {
    const list = siteData.sections[section] ? siteData.sections[section].items : siteData[section].items;
    list[index].image = value;
    await saveContent(false);
}
