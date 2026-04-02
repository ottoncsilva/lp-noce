const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const basicAuth = require('express-basic-auth');

const CONTENT_FILE = path.join(__dirname, '..', 'data', 'content.json');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

// Ensure image directories exist
const sections = ['cozinha', 'living', 'closet', 'banheiro', 'corporativo', 'acabamentos', 'parceiros'];
sections.forEach(sec => {
    const dir = path.join(IMAGES_DIR, sec);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Setup Multer (memory storage for Sharp processing)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Auth Middleware for protected routes
const adminUsers = {};
adminUsers[process.env.ADMIN_USER] = process.env.ADMIN_PASS;
const protect = basicAuth({ users: adminUsers, challenge: true });

// --- PUBLIC ROUTES ---

// GET /api/content - Fetch site content (Public)
router.get('/content', (req, res) => {
    try {
        const data = fs.readFileSync(CONTENT_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar conteúdo' });
    }
});

// --- PROTECTED ROUTES ---

// POST /api/content - Update site content
router.post('/content', protect, (req, res) => {
    try {
        const newContent = req.body;
        fs.writeFileSync(CONTENT_FILE, JSON.stringify(newContent, null, 2), 'utf8');
        res.json({ success: true, message: 'Conteúdo atualizado' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar conteúdo' });
    }
});

// POST /api/upload/:section - Upload Images
router.post('/upload/:section', protect, upload.array('photos', 20), async (req, res) => {
    try {
        const section = req.params.section;
        if (!sections.includes(section)) {
            return res.status(400).json({ error: 'Sessão inválida' });
        }

        const uploadedFiles = [];

        for (const file of req.files) {
            const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
            const filepath = path.join(IMAGES_DIR, section, filename);

            // Compress and convert to JPG using Sharp
            await sharp(file.buffer)
                .resize({ width: 1920, withoutEnlargement: true })
                .jpeg({ quality: 80, progressive: true })
                .toFile(filepath);

            uploadedFiles.push(`/images/${section}/${filename}`);
        }

        res.json({ success: true, files: uploadedFiles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no upload' });
    }
});

// DELETE /api/upload - Delete an image
router.delete('/upload', protect, (req, res) => {
    try {
        const { imagePath } = req.body; // e.g., "/images/cozinha/123.jpg"
        if (!imagePath || !imagePath.startsWith('/images/')) {
            return res.status(400).json({ error: 'Caminho inválido' });
        }

        const absolutePath = path.join(__dirname, '..', 'public', imagePath);
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao apagar' });
    }
});

module.exports = router;
