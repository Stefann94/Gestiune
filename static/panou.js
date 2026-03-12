document.addEventListener('DOMContentLoaded', function () {

    // Verificăm dacă venim din pagina de Inventar cu dorința de a deschide modalul
    if (localStorage.getItem('openUrgenteModal') === 'true') {

        setTimeout(() => {
            // Verificăm dacă funcția de deschidere a tabelului de audit există
            if (typeof openFixStocModal === 'function') {
                console.log("Redirecționare directă către Fixare Stoc & Audit...");
                openFixStocModal();
            } else {
                // Fallback: Dacă nu e încărcat fixstoc.js, forțăm afișarea modalului
                const fixModal = document.getElementById('fixStocModal');
                if (fixModal) {
                    fixModal.style.display = 'flex';
                    fixModal.classList.add('active');
                    document.body.classList.add('modal-open');
                    // Încercăm să încărcăm datele dacă funcția e disponibilă
                    if (typeof incarcaDateFixStoc === 'function') incarcaDateFixStoc();
                }
            }

            // Ștergem flag-ul
            localStorage.removeItem('openUrgenteModal');
        }, 500);
    }

    // --- 1. CONFIGURARE GRAFIC POLAR (Categorii) ---
    const ctx = document.getElementById('polarChart').getContext('2d');
    let myChart; // Păstrăm referința pentru a-l putea actualiza

    function initChart(labels, values) {
        if (myChart) {
            myChart.destroy(); // Distrugem graficul vechi dacă facem refresh
        }

        myChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.7)', // Verde
                        'rgba(99, 102, 241, 0.7)', // Indigo
                        'rgba(245, 158, 11, 0.7)', // Chihlimbar
                        'rgba(239, 68, 68, 0.7)',  // Roșu
                        'rgba(100, 116, 139, 0.7)', // Slate
                        'rgba(14, 165, 233, 0.7)'  // Sky
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        grid: { color: 'rgba(0,0,0,0.05)' },
                        ticks: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 25,
                            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
                        }
                    }
                }
            }
        });
    }

    // Preluare date reale pentru grafic
    fetch('/api/stats/categorii')
        .then(res => res.json())
        .then(data => {
            initChart(data.labels, data.values);
        })
        .catch(err => console.error("Eroare incarcare categorii:", err));


    // --- 2. LOGICĂ MODAL ANALIZĂ (Card Valoare Inventar) ---
    const cardValoare = document.querySelector('.kpi-card.glass:first-child');
    const modal = document.getElementById('valoareModal');
    const closeBtn = document.querySelector('.close-modal');

    if (cardValoare) {
        cardValoare.style.cursor = "pointer";
        cardValoare.addEventListener('click', () => {
            modal.classList.add('active');
            document.body.classList.add('modal-open'); // ÎNGHEAȚĂ PAGINA DIN SPATE

            // --- În interiorul panou.js, înlocuiește secțiunea FETCH de la punctul 2 ---

            fetch('/api/stats/top-produse')
                .then(res => res.json())
                .then(data => {
                    const listaScumpe = document.getElementById('listaScumpe');
                    const listaVandute = document.getElementById('listaVandute');

                    // 1. Populare Cele mai Scumpe
                    if (data.scumpe && data.scumpe.length > 0) {
                        listaScumpe.innerHTML = data.scumpe.map(p => `
                <tr>
                    <td><strong>${p.name}</strong></td>
                    <td class="text-right">
                        <strong class="text-gold">${parseFloat(p.price).toFixed(2)} RON</strong>
                    </td>
                </tr>
            `).join('');
                    } else {
                        listaScumpe.innerHTML = '<tr><td colspan="2">Fără date disponibile</td></tr>';
                    }

                    // 2. Populare Cele mai Vândute (Fără simbolul #)
                    if (data.vandute && data.vandute.length > 0) {
                        listaVandute.innerHTML = data.vandute.map(p => {
                            const total = parseInt(p.total_vandut) || 0;
                            return `
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center;">
                                <strong style="color: #1e293b;">${p.name}</strong>
                            </div>
                        </td>
                        <td class="text-right">
                            <strong class="text-orange" style="font-size: 1.1rem;">
                                ${total} <small style="font-weight: 400; font-size: 0.8rem; color: #64748b;">unități</small>
                            </strong>
                        </td>
                    </tr>
                `;
                        }).join('');
                    } else {
                        listaVandute.innerHTML = '<tr><td colspan="2" class="text-center">Nicio vânzare înregistrată</td></tr>';
                    }
                })
                .catch(err => {
                    console.error("Eroare incarcare top produse:", err);
                    document.getElementById('listaVandute').innerHTML = '<tr><td colspan="2">Eroare la încărcare date</td></tr>';
                });
        });
    }

    // Închidere Modal
    // Funcție pentru închidere (reutilizabilă)
    function closeModal() {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open'); // DEZGHEAȚĂ PAGINA
    }

    // Închidere la butonul X
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // Închidere la click în afara modalului
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });


    // --- 3. UI ANIMATIONS & FILTERS ---

    // Animație hover pe carduri KPI
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = "translateY(-5px) scale(1.02)";
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = "translateY(0) scale(1)";
        });
    });

    // Search în tabelul de stocuri critice
    const tableSearch = document.getElementById('tableSearch');
    if (tableSearch) {
        tableSearch.addEventListener('keyup', function () {
            const value = this.value.toLowerCase();
            const rows = document.querySelectorAll('.table-section tbody tr');

            rows.forEach(row => {
                const productName = row.querySelector('.p-name').textContent.toLowerCase();
                row.style.display = productName.includes(value) ? '' : 'none';
            });
        });
    }

    console.log("Dashboard Master inițializat cu succes.");
});