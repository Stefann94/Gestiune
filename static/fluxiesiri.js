document.addEventListener('DOMContentLoaded', function () {
    const fluxCard = document.querySelector('.kpi-card.activity');
    if (fluxCard) {
        fluxCard.style.cursor = 'pointer';
        fluxCard.addEventListener('click', openFluxModal);
        
        // Actualizăm numărul de pe buton direct la încărcarea paginii
        updateFluxButtonValue();
    }
});

// Funcție pentru a prelua datele și a actualiza cifra de pe butonul din dashboard
async function updateFluxButtonValue() {
    try {
        const response = await fetch('/api/stats/flux-iesiri');
        const data = await response.json();
        const fluxValueDisplay = document.querySelector('.kpi-card.activity .value');
        
        if (data && fluxValueDisplay) {
            const totalUnitati = data.reduce((acc, p) => acc + p.unitati, 0);
            fluxValueDisplay.innerHTML = `${totalUnitati} <small>Unități</small>`;
        }
    } catch (error) {
        console.error("Eroare la actualizarea cifrei de pe buton:", error);
    }
}

async function openFluxModal() {
    const modal = document.getElementById('fluxModal');
    const container = document.getElementById('recentIesiriContent');
    const badge = document.getElementById('countIesiri');

    modal.classList.add('active');
    document.body.classList.add('modal-open');

    // Afișăm un mesaj de încărcare în interiorul wrapper-ului tău de tabel
    container.innerHTML = '<div style="padding: 20px; text-align: center;">Se încarcă datele...</div>';

    try {
        const response = await fetch('/api/stats/flux-iesiri');
        const data = await response.json();

        if (data.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center;">Nu sunt ieșiri detectate (Stocul faptic este la fel cu cel din sistem).</div>';
            badge.innerText = "0 produse";
            return;
        }

        // Calculăm totalul unităților ieșite (suma coloanei unitati)
        const totalUnitati = data.reduce((acc, p) => acc + p.unitati, 0);

        // Actualizăm badge-ul să arate: "X produse (Total: Y unități)"
        badge.innerText = `${data.length} produse (Total: ${totalUnitati} unități)`;

        // Actualizăm și butonul din spate în caz că s-au schimbat datele
        const fluxValueDisplay = document.querySelector('.kpi-card.activity .value');
        if (fluxValueDisplay) {
            fluxValueDisplay.innerHTML = `${totalUnitati} <small>Unități</small>`;
        }

        // Construim tabelul folosind strict clasele tale din CSS (table, modern-table-wrapper, text-right, etc.)
        let html = `
            <div class="modern-table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Produs</th>
                            <th>Categorie</th>
                            <th class="text-right">Preț Unitar</th>
                            <th class="text-right">Unități Ieșite</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(p => `
                            <tr class="product-row">
                                    <td>
                                        <div class="product-cell">
                                            <div class="product-info">
                                                <strong class="p-name">${p.nume}</strong>
                                            </div>
                                        </div>
                                    </td>
                                <td>${p.categorie}</td>
                                <td class="text-right"><strong>${p.pret.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</strong></td>
                                <td class="text-right">
                                    <strong class="text-orange">-${p.unitati} buc</strong>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;

    } catch (error) {
        console.error("Eroare flux:", error);
        container.innerHTML = '<div style="padding: 20px; color: red;">Eroare la încărcarea datelor.</div>';
    }
}

function closeFluxModal() {
    document.getElementById('fluxModal').classList.remove('active');
    document.body.classList.remove('modal-open');
}