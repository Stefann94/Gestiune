/**
 * INVENTAR.JS - Logica Completă pentru Audit și Gestiune
 */

// 1. ACTUALIZARE STATUS ÎN TIMP REAL (OK, Lipsă, Surplus)
function updateRowStatus(input) {
    const row = input.closest('tr');
    if (!row) return;

    // Preluăm valorile (System Stock este stocat în data-attribute la randare)
    const systemStock = parseInt(row.getAttribute('data-system-stock')) || 0;
    const fapticStock = parseInt(input.value);

    // Identificăm elementele de UI din rând
    const statusSpan = row.querySelector('.status-indicator');

    // Dacă inputul e gol sau nu e număr
    if (isNaN(fapticStock)) {
        statusSpan.textContent = "Introdu cant.";
        statusSpan.className = "status-indicator";
        return;
    }

    // Adăugăm clasa 'modified' pentru feedback vizual
    row.classList.add('modified');

    // Logica de comparare și atribuire status
    if (fapticStock === systemStock) {
        statusSpan.textContent = 'OK';
        statusSpan.className = 'status-indicator synced';
        row.setAttribute('data-status', 'synced');
    } 
    else if (fapticStock < systemStock) {
        const diff = systemStock - fapticStock;
        statusSpan.textContent = `Lipsă (-${diff})`;
        statusSpan.className = 'status-indicator shortage';
        row.setAttribute('data-status', 'shortage');
    } 
    else {
        const diff = fapticStock - systemStock;
        statusSpan.textContent = `Surplus (+${diff})`;
        statusSpan.className = 'status-indicator surplus';
        row.setAttribute('data-status', 'surplus');
    }
}

// 2. FILTRARE DUPĂ TEXT (Nume Produs sau SKU)
function filterInventory() {
    const query = document.getElementById('inventorySearch').value.toLowerCase().trim();
    const rows = document.querySelectorAll('.product-row');

    rows.forEach(row => {
        const name = row.querySelector('.editable-name').textContent.toLowerCase();
        const sku = row.querySelector('.editable-sku').textContent.toLowerCase();

        if (name.includes(query) || sku.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// 3. FILTRARE DUPĂ STATUS (Pills: Toate, Lipsă, Surplus, OK)
function filterByStatus(status) {
    // Update vizual butoane active
    document.querySelectorAll('.pill-audit').forEach(p => p.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-filter="${status}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const rows = document.querySelectorAll('.product-row');

    rows.forEach(row => {
        const rowStatus = row.getAttribute('data-status');
        if (status === 'all' || rowStatus === status) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// 4. SALVARE RÂND (Trimitere către Flask)
async function saveAuditRow(btn) {
    // Evităm dubla trimitere dacă butonul e deja dezactivat
    if (btn.disabled) return;

    const row = btn.closest('tr');
    const id = row.getAttribute('data-id');
    const fapticInput = row.querySelector('.faptic-input');
    const fapticValue = fapticInput.value;
    const name = row.querySelector('.editable-name').textContent.trim();
    const sku = row.querySelector('.editable-sku').textContent.trim();

    // Validare
    if (fapticValue === "" || isNaN(parseInt(fapticValue))) {
        alert("Te rugăm să introduci o cantitate validă.");
        return;
    }

    const fapticQty = parseInt(fapticValue);
    const originalContent = btn.innerHTML;

    // UI Feedback: Start Loading
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const response = await fetch('/api/audit-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id,
                stock: fapticQty,
                name: name,
                sku: sku
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // 1. Sincronizăm valorile în Modal
            row.setAttribute('data-system-stock', fapticQty);
            const badgeSistem = row.querySelector('.system-stock-badge');
            if (badgeSistem) badgeSistem.textContent = fapticQty;
            row.classList.remove('modified');

            // 2. Sincronizăm Tabelul din Dashboard (din spatele modalului)
            // Folosim selector flexibil pentru a găsi rândul în tabelul principal
            const dashboardRowStock = document.querySelector(`.container-dashboard tr[data-id="${id}"] .stock-cell, .dashboard-table tr[data-id="${id}"] .stock-cell`);
            if (dashboardRowStock) {
                dashboardRowStock.textContent = fapticQty;
            }

            // 3. Resetăm statusul la "OK" (verde)
            updateRowStatus(fapticInput);

            // 4. UI Feedback: Succes
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.style.backgroundColor = "#059669"; 

            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-save"></i>';
                btn.disabled = false;
                btn.style.backgroundColor = ""; 
            }, 2000);

            if (typeof showToast === "function") {
                showToast(`Audit finalizat: ${name}`);
            }
        } else {
            throw new Error(data.message || "Eroare la server");
        }
    } catch (error) {
        console.error("Audit Error:", error);
        alert("Eroare la salvare: " + error.message);
        btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        btn.style.backgroundColor = "#dc2626";
        btn.disabled = false;
    }
}

// MODAL CONTROL OPTIMIZAT
function openInventoryModal() {
    const modal = document.getElementById('inventoryModal');   
    if (modal) {
        modal.style.display = 'flex';
        // Blocăm scroll-ul pe body
        document.body.style.overflow = 'hidden'; 
    }
}

function closeInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.style.display = 'none';
        // Reactivăm scroll-ul pe body
        document.body.style.overflow = 'auto'; 
        
        document.getElementById('inventorySearch').value = '';
        filterInventory();
    }
}

// Repetă logica și pentru modalul de adăugare produs (în adauga-produs.js sau unde îl ai)
function openModal() {
    document.getElementById('productModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}