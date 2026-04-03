require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const basicAuth = require('express-basic-auth');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required env vars
if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    console.error('❌ ADMIN_USER and ADMIN_PASS must be set in .env');
    process.exit(1);
}

// Middleware
app.use(compression()); // gzip all responses
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — protect admin/api from brute force
const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiWriteRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin Authentication Setup
const adminUsers = {};
adminUsers[process.env.ADMIN_USER] = process.env.ADMIN_PASS;

const challengeAuth = basicAuth({
    users: adminUsers,
    challenge: true,
    realm: 'Noce Mobili Admin'
});

// Static Files with cache headers
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true,
    setHeaders: (res, filePath) => {
        // No cache for HTML files (always fresh)
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Protected Admin Portal
app.use('/admin', adminRateLimit, challengeAuth, express.static(path.join(__dirname, 'public', 'admin')));

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiWriteRateLimit, apiRoutes);

// Fallback to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Noce Mobili server running on http://localhost:${PORT}`);
});
