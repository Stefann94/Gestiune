/**
 * MAIN.JS - Gestiune Globală (Modale, Statistici, Securitate)
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inițializăm Navbar-ul
    if (typeof initCommonComponents === "function") {
        initCommonComponents();
    }
});

// --- GESTIUNE MODALE ---

function openModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function openInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Închidere modal la click în exteriorul ferestrei albe
window.onclick = function (event) {
    const prodModal = document.getElementById('productModal');
    const invModal = document.getElementById('inventoryModal');

    if (event.target == prodModal) closeModal();
    if (event.target == invModal) closeInventoryModal();
}

// --- FILTRARE ȘI UI ---

function filterInventory() {
    let input = document.getElementById('inventorySearch');
    if (!input) return;
    
    let filter = input.value.toLowerCase();
    let table = document.getElementById('inventoryTable');
    if (!table) return;
    
    let tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let nameEl = tr[i].getElementsByClassName('name')[0];
        let skuEl = tr[i].getElementsByClassName('sku')[0];
        
        if (nameEl && skuEl) {
            let name = nameEl.innerText.toLowerCase();
            let sku = skuEl.innerText.toLowerCase();
            tr[i].style.display = (name.includes(filter) || sku.includes(filter)) ? "" : "none";
        }
    }
}

function toggleParentScroll(isLocked) {
    const body = document.body;
    if (isLocked) {
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        body.style.setProperty('--scrollbar-width', scrollBarWidth + 'px');
        body.classList.add('modal-open');
    } else {
        body.classList.remove('modal-open');
        body.style.removeProperty('--scrollbar-width');
    }
}

// --- STATISTICI ȘI REFRESH ---

async function refreshHeroStats() {
    try {
        const response = await fetch('/api/stats-quick');
        const data = await response.json();

        const statItems = document.querySelectorAll('.stat-item');
        statItems.forEach(item => {
            const labelElement = item.querySelector('.label');
            const valueSpan = item.querySelector('.value');
            if (!labelElement || !valueSpan) return;

            const labelText = labelElement.innerText.trim();
            if (labelText === "Total Articole") valueSpan.innerText = data.total_items;
            if (labelText === "Sub Limită") valueSpan.innerText = data.alerts;
            if (labelText === "Mișcări Azi") valueSpan.innerText = data.moves_today;
        });
        
        console.log("Statistici actualizate:", data);
    } catch (e) {
        console.error("Update Hero eșuat:", e);
    }
}

// --- 1. FUNCȚIE PENTRU NOTIFICĂRI STILIZATE (TOAST) ---
function showToast(message, type = 'error') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);

        const style = document.createElement('style');
        style.innerHTML = `
            .toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 10000; }
            .toast-card { 
                background: white; border-left: 5px solid #ef4444; color: #1e293b;
                padding: 16px 24px; border-radius: 12px; margin-top: 10px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.15); display: flex;
                align-items: center; gap: 12px; font-family: 'Plus Jakarta Sans', sans-serif;
                min-width: 320px; animation: toastSlideIn 0.3s ease-out forwards;
            }
            .toast-card.success { border-left-color: #10b981; }
            .toast-card i { font-size: 1.2rem; }
            @keyframes toastSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            .toast-fade-out { animation: toastFadeOut 0.5s ease-in forwards; }
            @keyframes toastFadeOut { to { opacity: 0; transform: translateY(10px); } }
        `;
        document.head.appendChild(style);
    }

    const toast = document.createElement('div');
    toast.className = `toast-card ${type}`;
    const icon = type === 'error' ? 'fa-shield-alt' : 'fa-check-circle';
    const iconColor = type === 'error' ? '#ef4444' : '#10b981';

    toast.innerHTML = `
        <i class="fas ${icon}" style="color: ${iconColor}"></i>
        <div>
            <div style="font-weight: 800; font-size: 0.75rem; text-transform: uppercase; opacity: 0.6; margin-bottom: 2px;">
                ${type === 'error' ? 'Acces Restricționat' : 'Operațiune Reușită'}
            </div>
            <div style="font-size: 0.95rem; font-weight: 500;">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- 2. SECURITATE ȘI INTERCEPTARE (POLIȚISTUL) ---

async function handleGlobalSecurity(response) {
    try {
        const data = await response.clone().json();
        
        // 1. Afișăm notificarea stilizată
        showToast(data.message || "Nu aveți permisiunea necesară pentru această acțiune.", 'error');
        
        // 2. ÎNCHIDERE AUTOMATĂ MODALE (Nou adăugat)
        // Căutăm toate modalelor active și le închidem
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('active');
        });

        // Restabilim scroll-ul paginii în caz că modalul l-a blocat
        document.body.classList.remove('modal-open');
        document.body.style.overflow = 'auto';
        
        // 3. Deblocăm butoanele care au rămas în starea de Loading
        document.querySelectorAll('button').forEach(btn => {
            btn.disabled = false;
            if (btn.innerHTML.includes('fa-spinner')) {
                btn.innerHTML = 'Anulat';
            }
        });
    } catch (e) {
        showToast("Sesiune expirată sau permisiuni insuficiente.", 'error');
    }
}

// Declarăm originalFetch o singură dată pentru a evita erorile de duplicare
const originalFetch = window.fetch;

window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    // 1. Verificăm Securitatea (403 Forbidden)
    if (response.status === 403) {
        await handleGlobalSecurity(response);
        return response; // Oprim procesarea ulterioară
    }

    // 2. Refresh Statistici la succes
    const method = (args[1] && args[1].method) ? args[1].method.toUpperCase() : 'GET';
    
    if (response.ok && ['POST', 'DELETE', 'PUT'].includes(method)) {
        if (typeof refreshHeroStats === "function") {
            setTimeout(refreshHeroStats, 300);
        }
    }
    
    return response;
};