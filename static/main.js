document.addEventListener('DOMContentLoaded', () => {
    // 1. Inițializăm Navbar-ul
    if (typeof initCommonComponents === "function") {
        initCommonComponents();
    }

    // 2. Nu apelăm initHero aici cu date statice, 
    // deoarece index.html îl apelează deja cu datele reale din Python!
});

function openModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Blochează scroll-ul paginii din spate
}

function closeModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Reive scroll-ul
}

// Închide dacă se apasă în afara ferestrei albe
window.onclick = function (event) {
    const modal = document.getElementById('productModal');
    if (event.target == modal) {
        closeModal();
    }
}