window.initHero = function(total, alerts, moves) {
    const heroHTML = `
    <section class="hero-advanced">
        <div class="hero-wrapper">
            <div class="hero-header">
                <div class="user-info">
                    <div class="user-avatar"><i class="fas fa-user-shield"></i></div>
                    <div class="user-text">
                        <h1>Salutare, Admin!</h1>
                        <p>Sistemul este online. Ai <span class="highlight">${alerts} alerte</span> de stoc.</p>
                    </div>
                </div>
            </div>

            <div class="hero-tools">
                <div class="search-main">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Caută în baza de date pgAdmin...">
                    <button class="btn-search-go">Caută</button>
                </div>
            </div>

            <div class="hero-stats-grid">
                <div class="stat-item">
                    <div class="stat-icon purple"><i class="fas fa-boxes"></i></div>
                    <div class="stat-data">
                        <span class="value">${total}</span>
                        <span class="label">Total Articole</span>
                    </div>
                </div>
                <div class="stat-item ${alerts > 0 ? 'pulse-alert' : ''}">
                    <div class="stat-icon orange"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-data">
                        <span class="value">${alerts}</span>
                        <span class="label">Sub Limită</span>
                    </div>
                </div>
                <div class="stat-item">
                    <div class="stat-icon emerald"><i class="fas fa-history"></i></div>
                    <div class="stat-data">
                        <span class="value">${moves}</span>
                        <span class="label">Mișcări Azi</span>
                    </div>
                </div>
                <div class="stat-item action-add">
                    <i class="fas fa-plus-circle"></i>
                    <span>Produs Nou</span>
                </div>
            </div>
        </div>
    </section>`;
    
    document.getElementById('hero-placeholder').innerHTML = heroHTML;
};