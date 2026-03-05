document.addEventListener('DOMContentLoaded', () => {
    // Verificăm dacă funcțiile există înainte de a le apela
    if (window.initCommonComponents) {
        window.initCommonComponents();
    }

    if (window.initHero && document.getElementById('hero-placeholder')) {
        window.initHero(
            "Gestiune Stocuri Eficientă", 
            "Soluție completă pentru monitorizarea produselor în timp real."
        );
    }
});