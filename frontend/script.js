// Intersection Observer for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once it's visible
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        observer.observe(element);
    });

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Booking Form Logic
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = bookingForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Mengirim...';
            btn.disabled = true;

            const orderData = {
                customer_name: document.getElementById('customer_name').value,
                phone: document.getElementById('customer_phone').value,
                service_type: document.getElementById('service_type').value,
                issue_desc: document.getElementById('issue_desc').value,
                username: localStorage.getItem('userName') || null
            };

            try {
                // Simpan ke database (opsional)
                const apiBase = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                    ? 'http://localhost:3001' 
                    : 'https://repair-backend.onrender.com';
                const response = await fetch(`${apiBase}/api/orders`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                if (response.ok) {
                    document.getElementById('booking-msg').style.display = 'block';
                    setTimeout(() => { document.getElementById('booking-msg').style.display = 'none'; }, 5000);
                }
            } catch (error) {
                console.error('Error saving to DB:', error);
                // Lanjut saja ke WA meskipun DB error
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
                
                // Buka WhatsApp Admin dengan data yang sudah diisi
                const waNumber = '6281371864129';
                const waMessage = `Halo Admin RahmatFix, saya ingin memesan layanan reparasi:%0A%0A*Nama:* ${orderData.customer_name}%0A*No HP:* ${orderData.phone}%0A*Layanan:* ${orderData.service_type}%0A*Keluhan:* ${orderData.issue_desc}%0A%0AMohon info lebih lanjut.`;
                
                // Gunakan location.href agar tidak diblokir oleh Popup Blocker browser
                window.location.href = `https://wa.me/${waNumber}?text=${waMessage}`;
                bookingForm.reset();
            }
        });
    }
});
