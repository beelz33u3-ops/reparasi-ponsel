const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let dbPath = path.resolve(__dirname, 'repair.sqlite');

// Vercel Serverless Functions have a read-only filesystem except for /tmp
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const tmpPath = path.join('/tmp', 'repair.sqlite');
    if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, tmpPath);
    }
    dbPath = tmpPath;
}

const db = new sqlite3.Database(dbPath);
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT,
        role TEXT DEFAULT 'user'
    )`);
    // Insert default admin with hashed password
    db.run(`INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', '$2b$10$fK5mTmvZ0QdguWiqzVadeu4u2ESH7qKY2B2XevcTn5wFa0zCjRIV6', 'admin')`);
    // Update existing admin password to hash just in case
    db.run(`UPDATE users SET password = '$2b$10$fK5mTmvZ0QdguWiqzVadeu4u2ESH7qKY2B2XevcTn5wFa0zCjRIV6' WHERE username = 'admin' AND password = 'admin123'`);

    // In case the old admins table exists, migrate data (optional) but we can just use the new table.

    db.run(`CREATE TABLE IF NOT EXISTS otp_codes (
        email TEXT PRIMARY KEY,
        code TEXT,
        expires_at INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT,
        phone TEXT,
        service_type TEXT,
        issue_desc TEXT,
        status TEXT DEFAULT 'Menunggu Dikonfirmasi',
        price INTEGER DEFAULT 0,
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Alter tables for existing data
    db.run(`ALTER TABLE orders ADD COLUMN user_id INTEGER`, (err) => {});
    db.run(`ALTER TABLE orders ADD COLUMN price INTEGER DEFAULT 0`, (err) => {});
    db.run(`ALTER TABLE orders ADD COLUMN admin_notes TEXT`, (err) => {});
});
module.exports = db;
