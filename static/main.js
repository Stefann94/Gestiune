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