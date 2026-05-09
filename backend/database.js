const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const dbPath = path.join(dataDir, 'repair.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        db.serialize(() => {
            // Create users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'user'
            )`);

            // Create orders table
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                customer_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                service_type TEXT NOT NULL,
                issue_desc TEXT NOT NULL,
                status TEXT DEFAULT 'Menunggu Dikonfirmasi',
                price INTEGER DEFAULT 0,
                admin_notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Create otp_codes table
            db.run(`CREATE TABLE IF NOT EXISTS otp_codes (
                email TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                expires_at DATETIME NOT NULL
            )`);

            // Create tasks table for Task Manager Requirement
            db.run(`CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                completed BOOLEAN DEFAULT 0
            )`);

            // Insert default admin if not exists
            const adminPasswordHash = '$2a$10$fK5mTmvZ0QdguWiqzVadeu4u2ESH7qKY2B2XevcTn5wFa0zCjRIV6'; // admin123
            db.run(`INSERT OR IGNORE INTO users (username, password, email, role) VALUES ('admin', ?, 'admin@rahmatfix.com', 'admin')`, [adminPasswordHash]);
        });
    }
});

module.exports = db;
