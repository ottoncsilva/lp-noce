const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const basicAuth = require('express-basic-auth');

const CONTENT_FILE = path.join(__dirname, '..', 'data', 'content.json');
const IMAGES_DIR   = path.join(__dirname, '..', 'public', 'images');

// Ensure base images dir exists
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// Auth middleware
const adminUsers = {};
adminUsers[process.env.ADMIN_USER] = process.env.ADMIN_PASS;
const protect = basicAuth({ users: adminUsers, challenge: true });

// Multer — memory storage for Sharp
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml']);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
        }
    }
});

// ─── Helpers ────────────────────────────────────────────────

/** Sanitize a section/category ID: alphanumeric + dash/underscore only */
function sanitizeSectionId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
}

/** Ensure the upload dir for a section exists */
function ensureSectionDir(secId) {
    const dir = path.join(IMAGES_DIR, secId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// ─── PUBLIC ROUTES ───────────────────────────────────────────

// GET /api/content — site content (public)
router.get('/content', (req, res) => {
    try {
        if (!fs.existsSync(CONTENT_FILE)) {
            return res.json({});
        }
        const data = fs.readFileSync(CONTENT_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        console.error('GET /content error:', err);
        res.status(500).json({ error: 'Erro ao carregar conteúdo' });
    }
});

// ─── PROTECTED ROUTES ────────────────────────────────────────

// POST /api/content — save site content
router.post('/content', protect, (req, res) => {
    try {
        const newContent = req.body;
        // Ensure data dir exists
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        // Backup before overwriting to prevent data loss
        if (fs.existsSync(CONTENT_FILE)) {
            fs.copyFileSync(CONTENT_FILE, CONTENT_FILE + '.bak');
        }
        fs.writeFileSync(CONTENT_FILE, JSON.stringify(newContent, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        console.error('POST /content error:', err);
        res.status(500).json({ error: 'Erro ao salvar conteúdo' });
    }
});

// POST /api/upload/:section — upload images (any valid section id)
router.post('/upload/:section', protect, (req, res, next) => {
    upload.array('photos', 30)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Erro de upload: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const section = sanitizeSectionId(req.params.section);
        if (!section) return res.status(400).json({ error: 'ID de seção inválido' });

        const dir = ensureSectionDir(section);
        const uploadedFiles = [];

        for (const file of req.files) {
            const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
            const filepath = path.join(dir, filename);

            await sharp(file.buffer)
                .resize({ width: 1920, withoutEnlargement: true })
                .webp({ quality: 85 })
                .toFile(filepath);

            uploadedFiles.push(`/images/${section}/${filename}`);
        }

        res.json({ success: true, files: uploadedFiles });
    } catch (err) {
        console.error('POST /upload error:', err);
        res.status(500).json({ error: 'Erro no upload' });
    }
});

// DELETE /api/upload — delete a single image file
router.delete('/upload', protect, (req, res) => {
    try {
        const { imagePath } = req.body;
        if (!imagePath || !imagePath.startsWith('/images/')) {
            return res.status(400).json({ error: 'Caminho inválido' });
        }

        // Extra safety: no path traversal
        const relative = imagePath.replace(/^\/images\//, '');
        if (relative.includes('..')) return res.status(400).json({ error: 'Caminho inválido' });

        const absolutePath = path.join(IMAGES_DIR, relative);
        if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);

        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /upload error:', err);
        res.status(500).json({ error: 'Erro ao apagar' });
    }
});

module.exports = router;
