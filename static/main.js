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
    const prodModal = document.getElementById('productModal');
    const invModal = document.getElementById('inventoryModal');

    if (event.target == prodModal) closeModal();
    if (event.target == invModal) closeInventoryModal();
}

function openInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Blochează scroll-ul în spate
}

function closeInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function filterInventory() {
    let input = document.getElementById('inventorySearch');
    let filter = input.value.toLowerCase();
    let table = document.getElementById('inventoryTable');
    let tr = table.getElementsByTagName('tr');

    for (let i = 1; i < tr.length; i++) {
        let name = tr[i].getElementsByClassName('name')[0].innerText;
        let sku = tr[i].getElementsByClassName('sku')[0].innerText;
        if (name.toLowerCase().indexOf(filter) > -1 || sku.toLowerCase().indexOf(filter) > -1) {
            tr[i].style.display = "";
        } else {
            tr[i].style.display = "none";
        }
    }
}

// Închidere modal la click în exterior
window.onclick = function (event) {
    const invModal = document.getElementById('inventoryModal');
    const prodModal = document.getElementById('productModal');
    if (event.target == invModal) closeInventoryModal();
    if (event.target == prodModal) closeModal();
}

/**
 * Funcție globală pentru a bloca/debloca scroll-ul paginii
 * @param {boolean} isLocked - true pentru a bloca, false pentru a debloca
 */
function toggleParentScroll(isLocked) {
    const body = document.body;
    if (isLocked) {
        // Calculăm lățimea scrollbar-ului pentru a evita "săritura" paginii
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
        body.style.setProperty('--scrollbar-width', scrollBarWidth + 'px');
        body.classList.add('modal-open');
    } else {
        body.classList.remove('modal-open');
        body.style.removeProperty('--scrollbar-width');
    }
}

// Funcție globală care trage datele noi din DB și le pune în Hero
async function refreshHeroStats() {
    try {
        const response = await fetch('/api/stats-quick');
        const data = await response.json();

        // Căutăm direct după textul label-ului în interiorul stat-item-urilor
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

// "ȘMECHERIA": Interceptăm orice cerere fetch care modifică date
// Ori de câte ori o funcție (audit, adăugare, ștergere) se termină cu succes,
// chemăm automat refresh-ul de statistici.
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    
    // Dacă cererea a fost un succes (POST, DELETE, PUT)
    if (response.ok && args[1] && ['POST', 'DELETE', 'PUT'].includes(args[1].method)) {
        // Așteptăm un pic să se proceseze în DB, apoi cerem cifrele noi
        setTimeout(refreshHeroStats, 300); 
    }
    
    return response;
};