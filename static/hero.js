window.initHero = function (total, alerts, moves, user) {
    // 0. Configurație pentru Roluri (Culori și Iconițe)
    const roleConfig = {
        'owner': {
            icon: 'fa-crown',
            label: 'Owner',
            color: '#f59e0b', // Chihlimbar/Aur
            bg: 'rgba(245, 158, 11, 0.15)'
        },
        'admin': {
            icon: 'fa-user-shield',
            label: 'Administrator',
            color: '#8b5cf6', // Mov
            bg: 'rgba(139, 92, 246, 0.15)'
        },
        'operator': {
            icon: 'fa-user-gear',
            label: 'Operator',
            color: '#10b981', // Verde
            bg: 'rgba(16, 185, 129, 0.15)'
        },
        'guest': {
            icon: 'fa-user-secret',
            label: 'Vizitator',
            color: '#64748b',
            bg: 'rgba(100, 116, 139, 0.15)'
        }
    };

    const isGuest = !user ||
        user.role === null || user.role === 'null' ||
        user.username === null || user.username === 'null' ||
        user.role === 'operator' && user.username === 'Utilizator'; // Fallback-ul din index.html

    let role = isGuest ? 'guest' : user.role.toLowerCase();
    let name = isGuest ? 'Vizitator' : user.username;

    const config = roleConfig[role] || roleConfig['guest'];

    const heroHTML = `
    <section class="hero-advanced">
        <div class="hero-wrapper">
            <div class="hero-header">
                <div class="user-info">
                    <div class="user-avatar" style="background: ${config.bg}; color: ${config.color}; border: 2px solid ${config.color}33;">
                        <i class="fas ${config.icon}"></i>
                    </div>
                    <div class="user-text">
                        <h1>Salutare, ${name}!</h1>
                        <p>Ești logat ca <span style="color: ${config.color}; font-weight: 800; text-transform: uppercase; font-size: 0.85rem;">${config.label}</span>. Ai <span class="highlight">${alerts} alerte</span> de stoc.</p>
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
                <div class="stat-item action-history" onclick="openLedgerModal()" style="cursor:pointer;">
                    <div class="stat-icon dark" style="background: #10b981; color: #ffffff; border: none;">
                        <i class="fas fa-clipboard-list"></i>
                    </div>
                    <div class="stat-data">
                        <span class="value" style="color: #ffffff; font-weight: 600; font-size: 0.95rem;">Registru</span>
                    </div>
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

window.jumpToAuditProduct = function (productId) {
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

// Funcție pentru deschiderea modalului de istoric
/**
 * JURNAL ACTIVITATE (LEDGER) 
 * Gestionează afișarea istoricului de operațiuni cu detalii expandabile.
 */

// Funcție pentru deschiderea modalului de istoric
window.openLedgerModal = async function () {
    const modal = document.getElementById('ledgerModal');
    const container = document.getElementById('ledger-container');
    if (!modal || !container) return;

    // Afișăm modalul și un loader până vin datele
    modal.style.display = 'flex';
    container.innerHTML = `
        <div style="text-align:center; padding:3rem;">
            <i class="fas fa-spinner fa-spin fa-2x" style="color:#10b981"></i>
            <p style="margin-top:1rem; color:#64748b;">Se citește registrul de activitate...</p>
        </div>`;

    try {
        const response = await fetch('/api/v1/internal/inventory-event-ledger');
        const data = await response.json();

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:3rem; color:#64748b;">
                    <i class="fas fa-history fa-3x" style="opacity:0.2; margin-bottom:1rem;"></i>
                    <p>Nu există nicio operațiune înregistrată în istoric.</p>
                </div>`;
            return;
        }

        container.innerHTML = data.map(item => {
            // Formatare Dată și Oră
            const dateObj = new Date(item.created_at);
            const formattedDate = dateObj.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = dateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

            // Configurare Vizuală în funcție de tipul operațiunii
            let typeClass = 'type-audit';
            let icon = 'fa-pen-to-square';
            let accentColor = '#10b981'; // Verde (Audit/Modificare)

            const typeLower = item.type.toLowerCase();

            if (typeLower.includes('stergere')) {
                typeClass = 'type-stergere';
                icon = 'fa-trash-can';
                accentColor = '#ef4444'; // Roșu
            }
            else if (typeLower.includes('adaugare')) {
                typeClass = 'type-adaugare';
                icon = 'fa-circle-plus';
                accentColor = '#f59e0b'; // Galben/Portocaliu
            }

            return `
                <div class="ledger-item" style="border-left: 5px solid ${accentColor}">
                    <div class="ledger-summary" onclick="window.toggleLedgerDetail(this)">
                        <div style="display:flex; align-items:center; gap:1rem;">
                            <div class="ledger-icon-wrapper" style="color: ${accentColor}; background: ${accentColor}15; width:35px; height:35px; display:flex; align-items:center; justify-content:center; border-radius:50%;">
                                <i class="fas ${icon}"></i>
                            </div>
                            <div>
                                <div style="font-weight:700; color:#064e3b; font-size:0.95rem;">
                                    ${item.product_name} 
                                    <span style="font-weight:400; color:#94a3b8; font-size:0.8rem; margin-left:5px;">${item.sku ? `[${item.sku}]` : ''} </span>
                                </div>
                                <div style="font-size:0.75rem; color:#64748b;">
                                    <i class="far fa-clock"></i> ${formattedDate}, ora ${formattedTime}
                                </div>
                            </div>
                        </div>
                        <span class="ledger-type ${typeClass}">${item.type}</span>
                    </div>
                    <div class="ledger-details" style="display:none; padding:1rem; background:#f8fafc; border-top:1px dashed #e2e8f0; grid-template-columns:1fr 1fr; gap:1rem;">
                        <div class="detail-box">
                            <label style="display:block; font-size:0.7rem; color:#64748b; text-transform:uppercase;">Stoc Sistem</label>
                            <span style="font-weight:700; color:#1e293b;">
                                ${item.old_system_stock} 
                                <i class="fas fa-arrow-right" style="font-size:0.7rem; color:#10b981; margin:0 5px;"></i> 
                                ${item.new_system_stock}
                            </span>
                        </div>
                        <div class="detail-box">
                            <label style="display:block; font-size:0.7rem; color:#64748b; text-transform:uppercase;">Stoc Faptic</label>
                            <span style="font-weight:700; color:#1e293b;">
                                ${item.old_faptic_stock} 
                                <i class="fas fa-arrow-right" style="font-size:0.7rem; color:#10b981; margin:0 5px;"></i> 
                                ${item.new_faptic_stock}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Eroare Ledger:", err);
        container.innerHTML = `
            <div style="text-align:center; padding:3rem; color:#ef4444;">
                <i class="fas fa-exclamation-circle fa-2x"></i>
                <p style="margin-top:1rem;">Eroare la încărcarea datelor. Verificați conexiunea cu serverul.</p>
            </div>`;
    }
}

/**
 * Deschide/Închide secțiunea de detalii a unei operațiuni
 */
window.toggleLedgerDetail = function (summaryElement) {
    const details = summaryElement.nextElementSibling;
    if (!details) return;

    const isVisible = details.style.display === 'grid';

    // Închidem toate celelalte detalii deschise pentru a menține interfața curată
    document.querySelectorAll('.ledger-details').forEach(d => {
        d.style.display = 'none';
    });

    // Switch între vizibil/invizibil pentru elementul curent
    details.style.display = isVisible ? 'none' : 'grid';
}

/**
 * Închide modalul Ledger
 */
window.closeLedgerModal = function () {
    const modal = document.getElementById('ledgerModal');
    if (modal) modal.style.display = 'none';
}