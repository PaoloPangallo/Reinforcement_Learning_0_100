// ========== HAMBURGER MENU TOGGLE ==========
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const navItems = document.querySelectorAll('.nav-item');
const dropdowns = document.querySelectorAll('.dropdown');

// Toggle menu quando clicchi l'hamburger
hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Gestione dropdown su mobile
dropdowns.forEach(dropdown => {
    const dropdownLink = dropdown.querySelector('.nav-link');

    dropdownLink.addEventListener('click', (e) => {
        // Su desktop non fare nulla (il dropdown funziona con :hover)
        // Su mobile, toggle il dropdown
        if (window.innerWidth <= 768) {
            e.preventDefault();
            dropdown.classList.toggle('active');
        }
    });
});

// Chiudi menu quando clicchi su un link (ma non su dropdown)
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Se è un dropdown link, no chiudere il menu principale
        if (!link.closest('.dropdown')) {
            navMenu.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
});

// Chiudi dropdowns quando clicchi su un dropdown-item
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
        dropdowns.forEach(d => d.classList.remove('active'));
    });
});

// Chiudi menu quando clicchi fuori
document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar-container')) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    }
});

// ========== SMOOTH SCROLL ANCHOR LINKS ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// ========== NAVBAR SHADOW ON SCROLL ==========
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.boxShadow = 'none';
    }
});

// ========== ACTIVE NAV LINK (based on current page) ==========
function setActiveNavLink() {
    const currentPage = window.location.pathname;
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage || (href !== '#' && currentPage.includes(href))) {
            link.style.color = 'var(--primary)';
            link.style.borderBottom = '2px solid var(--primary)';
        } else {
            link.style.color = '';
            link.style.borderBottom = '';
        }
    });
}

setActiveNavLink();