/**
 * INVENTAR.JS - Logica Completă pentru Audit și Gestiune
 * Status: Sincronizare Live + Sistem de UNDO (Fix Stoc) perfect funcțional
 */

// --- 0. MEMORARE STARE INIȚIALĂ (PENTRU UNDO) ---
function initSafeStates() {
    document.querySelectorAll('.product-row').forEach(row => {
        const input = row.querySelector('.faptic-input');
        const indicator = row.querySelector('.status-indicator');
        if (input && indicator && !row.hasAttribute('data-safe-val')) {
            row.setAttribute('data-safe-val', input.value);
            row.setAttribute('data-safe-html', indicator.innerHTML);
            row.setAttribute('data-safe-class', indicator.className);
        }
    });
}
// Rulăm la încărcarea paginii
document.addEventListener('DOMContentLoaded', initSafeStates);


// --- 1. FILTRARE COMBINATĂ (TEXT + STATUS) ---
function applyCombinedFilters() {
    const searchQuery = document.getElementById('inventorySearch').value.toLowerCase().trim();
    const activePill = document.querySelector('.pill-audit.active');
    const activeStatus = activePill ? activePill.getAttribute('data-filter') : 'all';
    const rows = document.querySelectorAll('.product-row');

    rows.forEach(row => {
        const name = row.querySelector('.editable-name').textContent.toLowerCase();
        const sku = row.querySelector('.editable-sku').textContent.toLowerCase();
        
        const rowStatus = row.getAttribute('data-status') || 'synced';
        const isEditing = row.classList.contains('is-editing');
        const matchesText = name.includes(searchQuery) || sku.includes(searchQuery);
        let matchesStatus = (activeStatus === 'all' || rowStatus === activeStatus);
        
        if (isEditing) {
            matchesStatus = true; 
        }

        row.style.display = (matchesText && matchesStatus) ? '' : 'none';
    });
}

function filterInventory() { 
    applyCombinedFilters(); 
}

function filterByStatus(status) {
    document.querySelectorAll('.pill-audit').forEach(p => p.classList.remove('active'));
    const activeBtn = document.querySelector(`[data-filter="${status}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    applyCombinedFilters();
}


// --- 2. ACTUALIZARE STATUS VIZUAL (LIVE ÎN TIMPUL SCRIERII) ---
function updateRowStatus(input) {
    const row = input.closest('tr');
    if (!row) return;

    // Asigurăm-ne că starea de bază e memorată înainte să edităm
    initSafeStates();

    const systemStock = parseInt(row.getAttribute('data-system-stock')) || 0;
    const fapticStock = parseInt(input.value);
    const statusSpan = row.querySelector('.status-indicator');
    const saveBtn = row.querySelector('.save-audit-btn');

    if(saveBtn) saveBtn.disabled = false;

    if (isNaN(fapticStock)) {
        statusSpan.textContent = "Introdu cant.";
        statusSpan.className = "status-indicator";
        if(saveBtn) saveBtn.disabled = true;
        return;
    }

    row.classList.add('is-editing', 'modified');

    if (fapticStock === systemStock) {
        statusSpan.textContent = 'OK';
        statusSpan.className = 'status-indicator synced';
    } else if (fapticStock < systemStock) {
        const diff = systemStock - fapticStock;
        statusSpan.textContent = `Lipsă (${diff})`;
        statusSpan.className = 'status-indicator shortage';
    } else {
        const diff = fapticStock - systemStock;
        statusSpan.textContent = `Surplus (${diff})`;
        statusSpan.className = 'status-indicator surplus';
    }
}


// --- 3. SALVARE (SINCRONIZARE CU SERVER) ---
async function saveAuditRow(btn) {
    const row = btn.closest('tr');
    const productId = row.getAttribute('data-id');
    const fapticInput = row.querySelector('.faptic-input');
    const fapticValue = parseInt(fapticInput.value);

    // Feedback vizual (Loading)
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const response = await fetch('/api/audit-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: productId,
                stock: fapticValue,
                name: row.querySelector('.editable-name').textContent.trim(),
                sku: row.querySelector('.editable-sku').textContent.trim()
            })
        });

        const data = await response.json();

        if (data.status === 'success') {
            // ACTUALIZĂM "ADEVĂRUL" DIN HTML cu ce ne-a confirmat baza de date
            row.setAttribute('data-system-stock', fapticValue);
            row.setAttribute('data-status', data.new_status);
            
            // Actualizăm badge-ul de sistem
            const badge = row.querySelector('.system-stock-badge');
            if (badge) badge.textContent = fapticValue;

            // Curățăm starea de editare
            row.classList.remove('is-editing', 'modified');

            // Feedback succes
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.disabled = false;
                applyCombinedFilters();
            }, 1000);
        }
    } catch (e) {
        alert("Eroare server!");
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

// --- LOGICA DE FILTRARE (RĂMÂNE NESCHIMBATĂ) ---
function applyCombinedFilters() {
    const searchQuery = document.getElementById('inventorySearch').value.toLowerCase().trim();
    const activePill = document.querySelector('.pill-audit.active');
    const activeStatus = activePill ? activePill.getAttribute('data-filter') : 'all';
    
    document.querySelectorAll('.product-row').forEach(row => {
        const name = row.querySelector('.editable-name').textContent.toLowerCase();
        const sku = row.querySelector('.editable-sku').textContent.toLowerCase();
        const rowStatus = row.getAttribute('data-status') || 'synced';
        const isEditing = row.classList.contains('is-editing');

        const matchesText = name.includes(searchQuery) || sku.includes(searchQuery);
        let matchesStatus = (activeStatus === 'all' || rowStatus === activeStatus);
        
        // Dacă edităm rândul, nu îl ascundem chiar dacă filtrul s-ar schimba
        if (isEditing) matchesStatus = true;

        row.style.display = (matchesText && matchesStatus) ? '' : 'none';
    });
}

function filterByStatus(status) {
    document.querySelectorAll('.pill-audit').forEach(p => p.classList.remove('active'));
    document.querySelector(`[data-filter="${status}"]`).classList.add('active');
    applyCombinedFilters();
}


// --- 4. ȘTERGERE PRODUS ---
async function deleteProductRow(button, id) {
    if (!confirm("Ești sigur că vrei să ștergi definitiv acest produs?")) return;
    try {
        const response = await fetch(`/api/product-delete/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'success') {
            button.closest('tr').remove();
        }
    } catch (error) {
        alert("Eroare la ștergere.");
    }
}


// --- 5. MODALE ---
function openInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'flex';
    initSafeStates(); // Ne asigurăm că stările sunt citite corect la deschidere
}
function closeInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'none';
    applyCombinedFilters();
}


// --- 6. RESETARE MODIFICĂRI NESALVATE (FIX STOC) ---
function resetAllUnsavedChanges() {
    // Luăm doar rândurile care sunt modificate activ (nesalvate încă)
    const editedRows = document.querySelectorAll('.product-row.is-editing, .product-row.modified');
    
    if (editedRows.length === 0) {
        const btn = document.querySelector('.btn-fix-stock');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Nimic de anulat';
        setTimeout(() => btn.innerHTML = originalText, 1500);
        return;
    }

    editedRows.forEach(row => {
        const input = row.querySelector('.faptic-input');
        const indicator = row.querySelector('.status-indicator');
        const saveBtn = row.querySelector('.save-audit-btn');

        // Restaurăm la valorile sigure memorate în atributele data-safe
        if (input && row.hasAttribute('data-safe-val')) {
            input.value = row.getAttribute('data-safe-val');
        }
        
        if (indicator && row.hasAttribute('data-safe-html')) {
            indicator.innerHTML = row.getAttribute('data-safe-html');
            indicator.className = row.getAttribute('data-safe-class');
        }

        // Eliminăm starea de editare
        row.classList.remove('is-editing', 'modified');
        if (saveBtn) saveBtn.disabled = false;
    });

    // Reaplicăm filtrele vizuale
    applyCombinedFilters();
}