fetch('https://reparasi-ponsel-production.up.railway.app/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
}).then(res => res.json()).then(console.log);
