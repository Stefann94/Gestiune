// FIXSTOC.JS
async function openFixStocModal() {
    // Închidem modalul de urgențe dacă e deschis
    document.getElementById('urgenteModal').classList.remove('active');
    
    // Aici putem deschide un modal separat sau refolosi structura
    // Recomand un element nou în HTML: <div id="fixStocModal" class="modal-overlay">...</div>
    document.getElementById('fixStocModal').classList.add('active');
    
    loadFixStocData();
}

async function loadFixStocData() {
    const response = await fetch('/api/stats/urgente-detaliate');
    const data = await response.json();
    
    const tbody = document.getElementById('tbody-fixstoc');
    tbody.innerHTML = '';

    // Combinăm toate categoriile într-o listă plată pentru fixare
    const toate = [...data.critice, ...data.limitate, ...data.atentie];

    toate.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${p.name}</strong><br><small>${p.sku}</small></td>
                <td>${p.stoc_sistem}</td>
                <td><input type="number" class="input-audit" id="inp-${p.id}" value="${p.stoc_faptic}"></td>
                <td>${p.price || 0} RON</td>
                <td>
                    <button class="btn-save-audit" onclick="saveSingleAudit(${p.id})">
                        <i class="fas fa-check"></i> Fix
                    </button>
                </td>
            </tr>
        `;
    });
}

async function saveSingleAudit(productId) {
    const newValue = document.getElementById(`inp-${productId}`).value;
    
    const response = await fetch('/api/audit-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, stock: newValue })
    });

    if (response.ok) {
        alert('Stoc actualizat cu succes!');
        loadFixStocData(); // Refresh listă
    }
}