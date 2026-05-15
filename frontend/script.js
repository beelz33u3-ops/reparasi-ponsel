// Intersection Observer for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    // --- 3D Animations Setup ---
    if (typeof VanillaTilt !== 'undefined') {
        VanillaTilt.init(document.querySelectorAll(".service-card"), {
            max: 15,
            speed: 400,
            glare: true,
            "max-glare": 0.2,
            scale: 1.02
        });
    }

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);


    }
    // ---------------------------

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

    // --- Mobile Navigation Menu Logic ---
    const navContainer = document.querySelector('.nav-container');
    if (navContainer && !document.querySelector('.mobile-menu-btn')) {
        const mobileBtn = document.createElement('div');
        mobileBtn.className = 'mobile-menu-btn';
        mobileBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        
        // Insert before auth area if it exists, otherwise append
        const authArea = document.getElementById('nav-auth-area');
        if (authArea) {
            navContainer.insertBefore(mobileBtn, authArea);
        } else {
            navContainer.appendChild(mobileBtn);
        }

        mobileBtn.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            if(navLinks) {
                navLinks.classList.toggle('active');
                if (navLinks.classList.contains('active')) {
                    mobileBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                } else {
                    mobileBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
                }
            }
        });
        
        // Handle dropdowns on mobile
        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('click', (e) => {
                if (window.innerWidth <= 900) {
                    // Hanya matikan link utama jika klik icon chevron
                    if (e.target.tagName === 'I') {
                        e.preventDefault();
                        dropdown.classList.toggle('active');
                    } else {
                        // Jika tidak ada href atau href '#', cegah default
                        const link = dropdown.querySelector('a');
                        if(link && (link.getAttribute('href') === '#' || link.getAttribute('href') === '')) {
                            e.preventDefault();
                            dropdown.classList.toggle('active');
                        }
                    }
                }
            });
        });
    }
    // ------------------------------------

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
                    : 'https://reparasi-ponsel-production.up.railway.app';
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
