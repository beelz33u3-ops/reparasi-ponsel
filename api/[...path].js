const express = require('express');
const cors = require('cors');
const db = require('./database');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'rahmatfix-super-secret-key-2026';

const app = express();
app.use(cors());
app.use(express.json());

// Setup Ethereal Email (Testing OTP)
let transporter;
nodemailer.createTestAccount((err, account) => {
    if (err) return console.error('Failed to create a testing account. ' + err.message);
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: { user: account.user, pass: account.pass }
    });
});

// 1. Request OTP (For Register or Forgot Password)
app.post('/api/request-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    db.run(`INSERT OR REPLACE INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)`, 
        [email, code, expiresAt], async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        try {
            let info = await transporter.sendMail({
                from: '"RahmatFix Admin" <admin@rahmatfix.com>',
                to: email,
                subject: "Kode Verifikasi RahmatFix",
                text: `Kode verifikasi Anda adalah: ${code}. Berlaku selama 10 menit.`
            });
            console.log("Preview OTP Email URL: %s", nodemailer.getTestMessageUrl(info));
            res.json({ success: true, previewUrl: nodemailer.getTestMessageUrl(info) });
        } catch(e) {
            res.status(500).json({ error: 'Gagal mengirim email' });
        }
    });
});

// 2. Register with OTP
app.post('/api/register', (req, res) => {
    const { email, password, otp } = req.body;
    
    db.get(`SELECT * FROM otp_codes WHERE email = ? AND code = ?`, [email, otp], async (err, row) => {
        if (!row) return res.status(400).json({ error: 'Kode OTP salah' });
        if (Date.now() > row.expires_at) return res.status(400).json({ error: 'Kode OTP kadaluarsa' });

        const hashedPassword = await bcrypt.hash(password, 10);

        db.run(`INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, 'user')`, 
            [email, hashedPassword, email], function(err) {
            if (err) return res.status(400).json({ error: 'Email sudah terdaftar' });
            db.run(`DELETE FROM otp_codes WHERE email = ?`, [email]); // hapus OTP
            res.json({ success: true });
        });
    });
});

// 3. Reset Password with OTP
app.post('/api/reset-password', (req, res) => {
    const { email, newPassword, otp } = req.body;
    
    db.get(`SELECT * FROM otp_codes WHERE email = ? AND code = ?`, [email, otp], async (err, row) => {
        if (!row) return res.status(400).json({ error: 'Kode OTP salah' });
        if (Date.now() > row.expires_at) return res.status(400).json({ error: 'Kode OTP kadaluarsa' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.run(`UPDATE users SET password = ? WHERE email = ?`, [hashedPassword, email], function(err) {
            if (this.changes === 0) return res.status(404).json({ error: 'Email belum terdaftar' });
            db.run(`DELETE FROM otp_codes WHERE email = ?`, [email]); // hapus OTP
            res.json({ success: true });
        });
    });
});

// User/Admin Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT id, role, password FROM users WHERE username = ? OR email = ?`, [username, username], async (err, user) => {
        if (!user) return res.status(401).json({ error: 'Username atau email tidak ditemukan' });
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Password salah' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, role: user.role });
    });
});

// Create Order (From Landing Page)
app.post('/api/orders', (req, res) => {
    const { customer_name, phone, service_type, issue_desc, username } = req.body;
    
    // Look up user_id if username is provided
    if (username) {
        db.get(`SELECT id FROM users WHERE username = ? OR email = ?`, [username, username], (err, user) => {
            const userId = user ? user.id : null;
            insertOrder(userId);
        });
    } else {
        insertOrder(null);
    }

    function insertOrder(userId) {
        db.run(`INSERT INTO orders (user_id, customer_name, phone, service_type, issue_desc) VALUES (?, ?, ?, ?, ?)`, 
            [userId, customer_name, phone, service_type, issue_desc], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
    }
});

// Get User's Own Orders
app.get('/api/my-orders', (req, res) => {
    const { username } = req.query;
    db.get(`SELECT id FROM users WHERE username = ? OR email = ?`, [username, username], (err, user) => {
        if (!user) return res.status(401).json({ error: 'User not found' });
        
        db.all(`SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`, [user.id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });
});

// Get Orders (Admin)
app.get('/api/orders', (req, res) => {
    db.all(`SELECT * FROM orders ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update Order (Admin)
app.put('/api/orders/:id', (req, res) => {
    const { status, price, admin_notes } = req.body;
    let query = `UPDATE orders SET `;
    let params = [];
    if (status !== undefined) { query += `status = ?, `; params.push(status); }
    if (price !== undefined) { query += `price = ?, `; params.push(price); }
    if (admin_notes !== undefined) { query += `admin_notes = ?, `; params.push(admin_notes); }
    
    // remove last comma
    query = query.slice(0, -2);
    query += ` WHERE id = ?`;
    params.push(req.params.id);

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Delete Order (Admin)
app.delete('/api/orders/:id', (req, res) => {
    db.run(`DELETE FROM orders WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 3001;
// Jalankan server HANYA jika bukan di environment Vercel (production)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Repair API running on port ${PORT}`);
    });
}

// Export app untuk Vercel Serverless
module.exports = app;
