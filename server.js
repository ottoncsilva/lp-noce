require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Admin Authentication Setup
const adminUsers = {};
adminUsers[process.env.ADMIN_USER] = process.env.ADMIN_PASS;

const challengeAuth = basicAuth({
    users: adminUsers,
    challenge: true,
    realm: 'NOCE Admin Portal'
});

// Static Files
// Public website
app.use(express.static(path.join(__dirname, 'public')));

// Protected Admin Portal
app.use('/admin', challengeAuth, express.static(path.join(__dirname, 'public', 'admin')));

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Fallback to index.html for SPA if needed, or simply let express.static handle it
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`NOCE mobili server running on http://localhost:${PORT}`);
});
