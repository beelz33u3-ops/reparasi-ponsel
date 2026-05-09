fetch('https://reparasi-ponsel.vercel.app/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
}).then(res => res.text()).then(console.log).catch(console.error);
