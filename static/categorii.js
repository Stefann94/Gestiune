document.addEventListener('DOMContentLoaded', function() {
    const categoriiCard = document.querySelector('.kpi-card.info');
    if (categoriiCard) {
        categoriiCard.style.cursor = 'pointer';
        categoriiCard.addEventListener('click', openCategoriiModal);
    }
});

async function openCategoriiModal() {
    const modal = document.getElementById('categoriiModal');
    const summaryGrid = document.getElementById('categoriesSummary');
    const tableBody = document.getElementById('listaCategoriiDetaliat');
    
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    try {
        const response = await fetch('/api/stats/categorii-active');
        const data = await response.json();



        // 2. Tabelul cu cele 4 coloane cerute
        tableBody.innerHTML = data.detalii.map(cat => {
            let topProdusHtml = '<span class="text-muted">Fără pierderi</span>';
            
            if (cat.top_produs) {
                topProdusHtml = `
                    <div style="line-height: 1.2;">
                        <span class="text-danger" style="font-weight: 600;">
                            <i class="fas fa-caret-down"></i> ${cat.top_produs.nume}
                        </span>
                        <br>
                        <small style="color: #ef4444; font-size: 0.75rem;">
                            Diferență: ${cat.top_produs.diferenta} unități
                        </small>
                    </div>`;
            }

            return `
                <tr>
                    <td><strong>${cat.nume}</strong></td>
                    <td class="text-center">${cat.produse}</td>
                    <td class="text-right"><strong>${cat.valoare.toLocaleString('ro-RO', {minimumFractionDigits: 2})} RON</strong></td>
                    <td>${topProdusHtml}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Eroare:", error);
        tableBody.innerHTML = '<tr><td colspan="4">Eroare la încărcarea datelor.</td></tr>';
    }
}

function closeCategoriiModal() {
    // 1. Închidem modalul vizual
    document.getElementById('categoriiModal').classList.remove('active');
    
    // 2. REACTIVĂM scroll-ul pe pagina principală (FOARTE IMPORTANT)
    document.body.classList.remove('modal-open');
}