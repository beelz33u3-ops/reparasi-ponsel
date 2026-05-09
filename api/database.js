const path = require('path');
const fs = require('fs');

const dbPath = path.join('/tmp', 'repair.json');

// In-memory store
let data = {
    users: [],
    orders: [],
    otp_codes: []
};

// Load existing data if exists
if (fs.existsSync(dbPath)) {
    try {
        const fileContent = fs.readFileSync(dbPath, 'utf8');
        data = JSON.parse(fileContent);
    } catch (e) {
        console.error("Error reading JSON DB, starting fresh", e);
    }
}

// Ensure admin exists
const adminExists = data.users.find(u => u.username === 'admin');
if (!adminExists) {
    data.users.push({
        id: 1,
        username: 'admin',
        // hashed version of 'admin123'
        password: '$2a$10$fK5mTmvZ0QdguWiqzVadeu4u2ESH7qKY2B2XevcTn5wFa0zCjRIV6',
        email: 'admin@rahmatfix.com',
        role: 'admin'
    });
    saveData();
}

function saveData() {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    } catch(e) {
        console.error("Error saving JSON DB", e);
    }
}

// Mock SQLite API
const db = {
    run: function(query, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        params = params || [];
        
        try {
            // INSERT OR REPLACE INTO otp_codes (email, code, expires_at)
            if (query.includes('INSERT OR REPLACE INTO otp_codes')) {
                const [email, code, expiresAt] = params;
                data.otp_codes = data.otp_codes.filter(o => o.email !== email);
                data.otp_codes.push({ email, code, expires_at: expiresAt });
                saveData();
                if (callback) callback.call({ lastID: 1, changes: 1 }, null);
                return;
            }
            
            // INSERT INTO users
            if (query.includes('INSERT INTO users')) {
                const [username, password, email, role] = params;
                if (data.users.find(u => u.username === username || u.email === email)) {
                    if (callback) callback(new Error("Email/Username sudah terdaftar"));
                    return;
                }
                const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
                data.users.push({ id: newId, username, password, email, role: role || 'user' });
                saveData();
                if (callback) callback.call({ lastID: newId, changes: 1 }, null);
                return;
            }
            
            // UPDATE users SET password = ? WHERE email = ?
            if (query.includes('UPDATE users SET password')) {
                const [password, email] = params;
                const user = data.users.find(u => u.email === email);
                if (!user) {
                    if (callback) callback.call({ changes: 0 }, null);
                    return;
                }
                user.password = password;
                saveData();
                if (callback) callback.call({ changes: 1 }, null);
                return;
            }
            
            // DELETE FROM otp_codes WHERE email = ?
            if (query.includes('DELETE FROM otp_codes')) {
                const [email] = params;
                data.otp_codes = data.otp_codes.filter(o => o.email !== email);
                saveData();
                if (callback) callback.call({ changes: 1 }, null);
                return;
            }
            
            // INSERT INTO orders
            if (query.includes('INSERT INTO orders')) {
                const [userId, customerName, phone, serviceType, issueDesc] = params;
                const newId = data.orders.length > 0 ? Math.max(...data.orders.map(o => o.id)) + 1 : 1;
                data.orders.push({
                    id: newId,
                    user_id: userId,
                    customer_name: customerName,
                    phone,
                    service_type: serviceType,
                    issue_desc: issueDesc,
                    status: 'Menunggu Dikonfirmasi',
                    price: 0,
                    admin_notes: '',
                    created_at: new Date().toISOString()
                });
                saveData();
                if (callback) callback.call({ lastID: newId, changes: 1 }, null);
                return;
            }
            
            // UPDATE orders SET ...
            if (query.includes('UPDATE orders SET')) {
                // Dynamically parse the update since we build the query dynamically in [...path].js
                const id = params[params.length - 1]; // last param is ID
                const order = data.orders.find(o => o.id == id);
                if (!order) {
                    if (callback) callback.call({ changes: 0 }, null);
                    return;
                }
                
                let paramIndex = 0;
                if (query.includes('status = ?')) { order.status = params[paramIndex++]; }
                if (query.includes('price = ?')) { order.price = params[paramIndex++]; }
                if (query.includes('admin_notes = ?')) { order.admin_notes = params[paramIndex++]; }
                
                saveData();
                if (callback) callback.call({ changes: 1 }, null);
                return;
            }
            
            // DELETE FROM orders WHERE id = ?
            if (query.includes('DELETE FROM orders')) {
                const [id] = params;
                data.orders = data.orders.filter(o => o.id != id);
                saveData();
                if (callback) callback.call({ changes: 1 }, null);
                return;
            }
            
            // Default success for unknown run commands
            if (callback) callback.call({ changes: 1 }, null);

        } catch(e) {
            if (callback) callback(e);
        }
    },
    
    get: function(query, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        params = params || [];
        
        try {
            // SELECT * FROM otp_codes WHERE email = ? AND code = ?
            if (query.includes('FROM otp_codes')) {
                const [email, code] = params;
                const row = data.otp_codes.find(o => o.email === email && o.code === code);
                if (callback) callback(null, row);
                return;
            }
            
            // SELECT id, role, password FROM users WHERE username = ? OR email = ?
            // SELECT id FROM users WHERE username = ? OR email = ?
            if (query.includes('FROM users')) {
                const [username, email] = params;
                const row = data.users.find(u => u.username === username || u.email === email);
                if (callback) callback(null, row);
                return;
            }
            
            if (callback) callback(null, null);
        } catch(e) {
            if (callback) callback(e);
        }
    },
    
    all: function(query, params, callback) {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        params = params || [];
        
        try {
            // SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
            if (query.includes('WHERE user_id = ?')) {
                const [userId] = params;
                let rows = data.orders.filter(o => o.user_id == userId);
                rows.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                if (callback) callback(null, rows);
                return;
            }
            
            // SELECT * FROM orders ORDER BY created_at DESC
            if (query.includes('FROM orders')) {
                let rows = [...data.orders];
                rows.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
                if (callback) callback(null, rows);
                return;
            }
            
            if (callback) callback(null, []);
        } catch(e) {
            if (callback) callback(e);
        }
    }
};

module.exports = db;
