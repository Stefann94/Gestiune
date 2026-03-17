window.initHero = function (total, alerts, moves) {
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
                <div class="search-main" style="position: relative;"> 
                    <i class="fas fa-search"></i>
                    <input type="text" id="main-search-input" placeholder="Caută în baza de date..." autocomplete="off">
                    <button class="btn-search-go">Caută</button>
                    <div id="search-suggestions" class="suggestions-dropdown"></div>
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

    // 1. Injectăm HTML-ul în pagină
    document.getElementById('hero-placeholder').innerHTML = heroHTML;

    // 2. Selectăm elementele DUPĂ ce au fost injectate
    const searchInput = document.getElementById('main-search-input');
    const suggestionsBox = document.getElementById('search-suggestions');
    const searchBtn = document.querySelector('.btn-search-go');
    let debounceTimer;

    // --- LOGICA PENTRU SUGESTII ---
    // În hero.js, înlocuiește vechiul renderSuggestions cu acesta:
    const renderSuggestions = (products) => {
        if (!products || products.length === 0) {
            suggestionsBox.style.display = 'none';
            return;
        }

        suggestionsBox.innerHTML = products.map(p => `
    <div class="suggestion-item" onclick="jumpToAuditProduct(${p.id})">
        <div class="suggestion-info">
            <span class="suggestion-name">${p.name}</span>
            <span class="suggestion-sku">${p.sku}</span>
        </div>
        <div class="suggestion-stock-badge">
            ${p.stock !== null ? p.stock : 0} <small>faptic</small>
        </div>
    </div>
`).join('');
        suggestionsBox.style.display = 'block';
    };

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        clearTimeout(debounceTimer);

        if (term.length < 2) {
            suggestionsBox.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/v1/internal/inventory-omnisearch?term=${encodeURIComponent(term)}`);
                const result = await response.json();
                if (result.status === "success") {
                    renderSuggestions(result.data);
                }
            } catch (err) {
                console.error("Eroare sugestii:", err);
            }
        }, 300);
    });

    // --- LOGICA PENTRU CLICK PE BUTON (CAUTARE FULL) ---
    const triggerFullSearch = () => {
        const term = searchInput.value.trim();
        if (term.length >= 2) {
            alert("Executăm căutarea completă pentru: " + term);
            // window.location.href = `/search?q=${term}`;
        }
    };

    searchBtn.addEventListener('click', triggerFullSearch);

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            suggestionsBox.style.display = 'none';
            triggerFullSearch();
        }
    });

    // Închidem sugestiile la click în exterior
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-main')) {
            suggestionsBox.style.display = 'none';
        }
    });
};

window.jumpToAuditProduct = function(productId) {
    // 1. Închidem sugestiile de search (dacă sunt deschise)
    const suggestionsBox = document.getElementById('search-suggestions');
    if (suggestionsBox) suggestionsBox.style.display = 'none';

    // 2. Deschiem modalul de Audit
    openInventoryModal();

    // 3. Așteptăm un timp scurt pentru ca modalul să fie vizibil în DOM
    setTimeout(() => {
        // Găsim rândul corespunzător ID-ului
        const row = document.querySelector(`.product-row[data-id="${productId}"]`);

        if (row) {
            // Curățăm orice highlight anterior de pe alte rânduri
            document.querySelectorAll('.product-row').forEach(r => r.classList.remove('highlight-target'));

            // Resetăm filtrele pentru a fi siguri că produsul e vizibil
            document.getElementById('inventorySearch').value = '';
            filterByStatus('all'); 

            // Scroll lin către rândul respectiv în interiorul modalului
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Adăugăm o clasă pentru animație vizuală
            row.classList.add('highlight-target');

            // Punem focus pe input-ul faptic al acelui produs pentru editare rapidă
            const fapticInput = row.querySelector('.faptic-input');
            if (fapticInput) fapticInput.focus();
        } else {
            console.warn("Produsul nu a fost găsit în tabelul de audit curent.");
        }
    }, 300);
};