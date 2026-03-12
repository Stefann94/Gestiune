function incarcaUrgente() {
    console.log("Se încarcă datele pentru urgențe...");
    fetch('/api/stats/urgente-detaliate')
        .then(res => res.json())
        .then(data => {
            const containerCritice = document.getElementById('col-critice');
            const containerLimitate = document.getElementById('col-limitate');
            const containerAtentie = document.getElementById('col-atentie');

            const createCard = (p) => `
                <div class="urgente-card">
                    <div class="urgente-info">
                        <strong>${p.name}</strong>
                        <small>${p.sku}</small>
                    </div>
                    <div class="urgente-values">
                        <span class="val-faptic">Faptic: ${p.stoc_faptic}</span>
                    </div>
                </div>
            `;

            if(containerCritice) containerCritice.innerHTML = data.critice.map(p => createCard(p)).join('') || '<p class="empty-msg">Nicio urgență</p>';
            if(containerLimitate) containerLimitate.innerHTML = data.limitate.map(p => createCard(p)).join('') || '<p class="empty-msg">-</p>';
            if(containerAtentie) containerAtentie.innerHTML = data.atentie.map(p => createCard(p)).join('') || '<p class="empty-msg">-</p>';
        })
}

// Deschidere modal
document.addEventListener('DOMContentLoaded', () => {
    const cardUrgente = document.querySelector('.kpi-card.warning');
    const modalUrgente = document.getElementById('urgenteModal');

    if (cardUrgente && modalUrgente) {
        cardUrgente.style.cursor = 'pointer';
        cardUrgente.addEventListener('click', () => {
            modalUrgente.style.display = 'flex';
            document.body.classList.add('modal-open'); // BLOCARE SCROLL
            incarcaUrgente();
        });
    }
});

function closeUrgenteModal() {
    const modal = document.getElementById('urgenteModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open'); // ACTIVARE SCROLL
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('urgenteModal');
    if (event.target == modal) {
        modal.style.display = "none";
        document.body.classList.remove('modal-open'); // ACTIVARE SCROLL
    }
}