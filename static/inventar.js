/**

 * INVENTAR.JS - Logica Completă pentru Audit și Gestiune

 * Status: Sincronizare Live + Mutare în categorii DOAR LA SALVARE

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



document.addEventListener('DOMContentLoaded', initSafeStates);



// --- 1. FILTRARE COMBINATĂ (TEXT + STATUS) ---

function applyCombinedFilters() {

    const searchInput = document.getElementById('inventorySearch');

    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

   

    const activePill = document.querySelector('.pill-audit.active');

    const activeStatus = activePill ? activePill.getAttribute('data-filter') : 'all';

   

    document.querySelectorAll('.product-row').forEach(row => {

        const name = row.querySelector('.editable-name').textContent.toLowerCase();

        const sku = row.querySelector('.editable-sku').textContent.toLowerCase();

        const rowStatus = row.getAttribute('data-status') || 'synced';

       

        // --- LOGICA DE VIZIBILITATE ---

        const matchesText = name.includes(searchQuery) || sku.includes(searchQuery);

       

        // REPARAȚIA: Dacă rândul este în curs de editare (is-editing),

        // îl lăsăm vizibil indiferent de statusul lui actual.

        const isEditing = row.classList.contains('is-editing');

        let matchesStatus = (activeStatus === 'all' || rowStatus === activeStatus);

       

        if (isEditing) {

            matchesStatus = true; // Forțăm rămânerea pe ecran în timpul tastării

        }



        if (matchesText && matchesStatus) {

            row.style.display = '';

        } else {

            row.style.display = 'none';

        }

    });

}



function filterInventory() { applyCombinedFilters(); }



function filterByStatus(status) {

    document.querySelectorAll('.pill-audit').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`[data-filter="${status}"]`);

    if (activeBtn) activeBtn.classList.add('active');

    applyCombinedFilters();

}



// --- 2. ACTUALIZARE STATUS VIZUAL (FĂRĂ ASCUNDERE INSTANTĂ) ---

function updateRowStatus(input) {

    const row = input.closest('tr');

    if (!row) return;



    const systemReference = parseInt(row.getAttribute('data-system-stock')) || 0;

    const fapticStock = parseInt(input.value) || 0;

   

    const statusSpan = row.querySelector('.status-indicator');

    const saveBtn = row.querySelector('.btn-sync');



    // Marcăm rândul ca fiind în editare - asta îl va ține vizibil conform applyCombinedFilters

    row.classList.add('is-editing', 'modified');



    const diff = fapticStock - systemReference;



    if (diff === 0) {

        statusSpan.textContent = 'OK';

        statusSpan.className = 'status-indicator synced';

        row.setAttribute('data-status', 'synced');

    } else if (diff < 0) {

        statusSpan.textContent = `Lipsă (${Math.abs(diff)})`;

        statusSpan.className = 'status-indicator shortage';

        row.setAttribute('data-status', 'shortage');

    } else {

        statusSpan.textContent = `Surplus (${diff})`;

        statusSpan.className = 'status-indicator surplus';

        row.setAttribute('data-status', 'surplus');

    }



    if (saveBtn) saveBtn.disabled = false;

   

    // Apelăm filtrarea, dar acum is-editing e TRUE, deci rândul NU va dispărea

    applyCombinedFilters();

}

window.jumpToAuditProduct = function(productId) {
    const suggestionsBox = document.getElementById('search-suggestions');
    if (suggestionsBox) suggestionsBox.style.display = 'none';

    openInventoryModal();

    setTimeout(() => {
        const row = document.querySelector(`.product-row[data-id="${productId}"]`);

        if (row) {
            // Curățăm orice highlight anterior
            document.querySelectorAll('.product-row').forEach(r => r.classList.remove('highlight-target'));

            document.getElementById('inventorySearch').value = '';
            filterByStatus('all'); 

            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.add('highlight-target');

            const fapticInput = row.querySelector('.faptic-input');
            if (fapticInput) fapticInput.focus();

            // --- LOGICA PENTRU DURATĂ DE 2 SECUNDE ---
            setTimeout(() => {
                row.classList.remove('highlight-target');
            }, 2000); // 2000ms = 2 secunde
            // ----------------------------------------
        }
    }, 300);
};

// --- 3. SALVARE (AICI SE PRODUCE MUTAREA ÎN CATEGORII) ---

async function saveAuditRow(btn) {

    const row = btn.closest('tr');

    const productId = row.getAttribute('data-id');

    const fapticInput = row.querySelector('.faptic-input');

    const fapticValue = parseInt(fapticInput.value) || 0;



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

            // --- ACTUALIZĂM STATUSUL VIZUAL CONFORM SERVERULUI ---

            
            row.setAttribute('data-status', data.new_status);
           

            const statusSpan = row.querySelector('.status-indicator');

            if (data.new_status === 'shortage') {

                statusSpan.textContent = `Lipsă (${Math.abs(data.new_diff)})`;

                statusSpan.className = 'status-indicator shortage';

            } else if (data.new_status === 'surplus') {

                statusSpan.textContent = `Surplus (${data.new_diff})`;

                statusSpan.className = 'status-indicator surplus';

            } else {

                statusSpan.textContent = 'OK';

                statusSpan.className = 'status-indicator synced';

            }



            // --- SINCRONIZARE CU HERO (OPȚIONAL, DACĂ AI IMPLEMENTAT REFRESH) ---

            if (typeof refreshHeroStats === "function") refreshHeroStats();



            // --- SALVĂM STAREA PENTRU UNDO (SAFE STATE) ---

            row.setAttribute('data-safe-val', fapticValue);

            row.setAttribute('data-safe-html', statusSpan.innerHTML);

            row.setAttribute('data-safe-class', statusSpan.className);



            // Curățăm clasele de editare pentru a permite refiltrarea corectă

            row.classList.remove('is-editing', 'modified');



            btn.innerHTML = '<i class="fas fa-check"></i>';

            setTimeout(() => {

                btn.innerHTML = originalContent;

                btn.disabled = false;

                // Aplicăm filtrele pentru a muta rândul în categoria corectă dacă e cazul

                applyCombinedFilters();

            }, 800);

        } else {

            alert("Eroare: " + data.message);

            btn.innerHTML = originalContent;

            btn.disabled = false;

        }

    } catch (e) {

        console.error(e);

        alert("Eroare de conexiune!");

        btn.innerHTML = originalContent;

        btn.disabled = false;

    }

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
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.style.display = 'flex';
        toggleParentScroll(true); // <--- BLOCĂM PAGINA
        initSafeStates();
    }
}

function closeInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.style.display = 'none';
        toggleParentScroll(false); // <--- DEBLOCĂM PAGINA
        applyCombinedFilters();
    }
}



// --- redirectionare - panou (Dashboard) - urgente stoc ---

function resetAllUnsavedChanges() {
    // 1. Salvăm semnalul pentru modal
    localStorage.setItem('openUrgenteModal', 'true');
    
    // 2. Redirecționăm către ruta corectă definită în app.py
    window.location.href = '/dashboard'; 
}