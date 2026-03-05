window.initHero = function(title, subtitle) {
    const heroHTML = `
    <section class="hero">
        <div class="hero-content">
            <h1>${title}</h1>
            <p>${subtitle}</p>
            <button class="btn-main">Începe Acum</button>
        </div>
    </section>`;
    
    const target = document.getElementById('hero-placeholder');
    if (target) target.innerHTML = heroHTML;
};