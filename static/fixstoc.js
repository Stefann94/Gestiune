// fixstoc.js
let selectedProductId = null;
let currentFapticVechi = 0;
let isSaving = false; // Flag pentru a preveni dubla trimitere

// --- STILURI ---
if (!document.getElementById('fixstoc-styles')) {
    const style = document.createElement('style');
    style.id = 'fixstoc-styles';
    style.innerHTML = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .modal-open { overflow: hidden; }
    `;
    document.head.appendChild(style);
}

// --- NOTIFICARE (TOAST) ---
function showStockNotification(nume, vechi, nou) {
    const toast = document.createElement('div');
    toast.style = `
        position: fixed; bottom: 20px; right: 20px; 
        background: white; border-left: 5px solid #059669;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2);
        padding: 16px; border-radius: 8px; z-index: 10001;
        min-width: 280px; font-family: 'Plus Jakarta Sans', sans-serif;
        display: flex; flex-direction: column; gap: 4px;
        animation: slideIn 0.3s ease-out;
    `;
    
    toast.innerHTML = `
        <div style="color: #059669; font-weight: 700; font-size: 0.9rem;">
            <i class="fas fa-check-circle"></i> CANTITATE ACTUALIZATĂ
        </div>
        <div style="color: #1e293b; font-size: 0.85rem; font-weight: 600;">${nume}</div>
        <div style="color: #64748b; font-size: 0.8rem;">
            Stoc faptic: <span style="text-decoration: line-through;">${vechi}</span> ➔ <b>${nou}</b>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// --- LOGICĂ MODALURI ---
function closeFixStocModal() {
    const modal = document.getElementById('fixStocModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function closeMiniModal() {
    const mini = document.getElementById('miniModalFix');
    if (mini) mini.style.display = 'none';
    isSaving = false;
}

async function openFixStocModal() {
    const urgModal = document.getElementById('urgenteModal');
    if (urgModal) urgModal.style.display = 'none';

    const modal = document.getElementById('fixStocModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        await loadFixStocData();
    }
}

async function loadFixStocData() {
    const tbody = document.getElementById('tbody-fixstoc');
    if (!tbody) return;

    try {
        const response = await fetch('/api/stats/urgente-detaliate');
        const data = await response.json();
        
        let htmlContent = '';
        const toate = [...(data.critice || []), ...(data.limitate || []), ...(data.atentie || [])];

        toate.forEach(p => {
            // Escaping pentru nume ca să nu strice atributul onclick
            const safeName = p.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            htmlContent += `
                <tr>
                    <td><strong>${p.name}</strong><br><small>${p.sku}</small></td>
                    <td><span class="badge-system">${p.stoc_sistem}</span></td>
                    <td><span class="badge-faptic">${p.stoc_faptic}</span></td>
                    <td>${p.price || 0} RON</td>
                    <td class="text-right">
                        <button class="btn-save-audit" onclick="triggerMiniAdjust(${p.id}, ${p.stoc_faptic}, '${safeName}')">
                            <i class="fas fa-wrench"></i> FIX
                        </button>
                    </td>
                </tr>`;
        });
        
        tbody.innerHTML = htmlContent;
    } catch (e) { 
        console.error("Eroare la încărcarea tabelului:", e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Eroare la încărcarea datelor.</td></tr>';
    }
}

function triggerMiniAdjust(id, fapticActual, name) {
    selectedProductId = id;
    currentFapticVechi = fapticActual;
    
    const mini = document.getElementById('miniModalFix');
    const info = document.getElementById('miniModalInfo');
    
    if (mini && info) {
        mini.style.display = 'flex';
        info.innerText = name;
        document.getElementById('manualStockInput').value = '';
        
        const infoSistem = document.querySelector('.system-actual-info');
        if (infoSistem) infoSistem.innerHTML = `Faptic curent: <strong>${fapticActual}</strong>`;
    }
}

async function saveAuditAction(nouaValoare) {
    if (!selectedProductId || isSaving) return;

    const valoareNumerica = parseInt(nouaValoare);
    if (isNaN(valoareNumerica)) {
        alert("Te rugăm să introduci un număr valid!");
        return;
    }

    isSaving = true;
    
    // Găsim rândul din tabel înainte de a trimite cererea
    const btn = document.querySelector(`button[onclick*="triggerMiniAdjust(${selectedProductId}"]`);
    const row = btn ? btn.closest('tr') : null;

    try {
        const response = await fetch('/api/audit-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id: selectedProductId, 
                stock: valoareNumerica 
            })
        });

        const res = await response.json();

        if (res.status === 'success') {
            const numeProdus = document.getElementById('miniModalInfo').innerText;
            
            // --- LOGICA DE UPDATE LIVE FĂRĂ REFRESH ---
            if (row) {
                // 1. Actualizăm cifra din coloana "Faptic"
                const fapticBadge = row.querySelector('.badge-faptic');
                if (fapticBadge) {
                    fapticBadge.innerText = valoareNumerica;
                    fapticBadge.style.color = "#059669";
                }

                // 2. Înlocuim butonul de "FIX" cu un mesaj de succes
                const actionCell = row.querySelector('.text-right');
                if (actionCell) {
                    actionCell.innerHTML = `
                        <span class="status-updated">
                            <i class="fas fa-check"></i> ACTUALIZAT
                        </span>
                    `;
                }
                
                // 3. Opțional: Schimbăm fundalul rândului ușor pentru a marca editarea
                row.style.backgroundColor = "rgba(5, 150, 105, 0.05)";
            }

            closeMiniModal();
            showStockNotification(numeProdus, currentFapticVechi, valoareNumerica);
            
            // !!! NOTĂ: Am eliminat loadFixStocData() de aici. 
            // Produsul va dispărea doar la următorul refresh manual al paginii 
            // sau când utilizatorul închide și redeschide modalul principal.
            
            isSaving = false; 

        } else {
            alert("Eroare: " + (res.message || "Eroare necunoscută"));
            isSaving = false;
        }
    } catch (e) {
        console.error("Eroare la trimiterea datelor:", e);
        alert("Eroare de conexiune la server.");
        isSaving = false;
    }
}

// Handlers butoane modal mic
function handleEqualize() { 
    // Luăm valoarea din badge-ul de sistem de pe rândul selectat
    const btn = document.querySelector(`button[onclick*="triggerMiniAdjust(${selectedProductId}"]`);
    const row = btn ? btn.closest('tr') : null;
    const stocSistem = row ? parseInt(row.querySelector('.badge-system').innerText) : currentFapticVechi;
    
    saveAuditAction(stocSistem); 
}

function handleManualValue() {
    const input = document.getElementById('manualStockInput');
    if (input && input.value.trim() !== "") {
        saveAuditAction(input.value.trim());
    } else {
        alert("Introdu o valoare!");
    }
}