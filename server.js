require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const basicAuth = require('express-basic-auth');
const compression = require('compression');

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
app.use('/admin', challengeAuth, express.static(path.join(__dirname, 'public', 'admin')));

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Fallback to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Noce Mobili server running on http://localhost:${PORT}`);
});
