document.addEventListener('DOMContentLoaded', () => {
    // 1. Inițializăm Navbar-ul
    if (typeof initCommonComponents === "function") {
        initCommonComponents();
    }
    
    // 2. Nu apelăm initHero aici cu date statice, 
    // deoarece index.html îl apelează deja cu datele reale din Python!
});