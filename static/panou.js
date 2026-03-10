document.addEventListener('DOMContentLoaded', function() {
    
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
            
            fetch('/api/stats/top-produse')
                .then(res => res.json())
                .then(data => {
                    const listaScumpe = document.getElementById('listaScumpe');
                    const listaVandute = document.getElementById('listaVandute');

                    // Populare Tabel Cele mai Scumpe (cu reparare .toFixed)
                    listaScumpe.innerHTML = data.scumpe.map(p => {
                        const pretNumar = parseFloat(p.price) || 0;
                        return `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td class="text-right">
                                    <strong class="text-gold">${pretNumar.toFixed(2)} RON</strong>
                                </td>
                            </tr>
                        `;
                    }).join('');

                    // Populare Tabel Cele mai Vândute
                    listaVandute.innerHTML = data.vandute.map(p => `
                        <tr>
                            <td><strong>${p.name}</strong></td>
                            <td class="text-right">
                                <strong class="text-orange">${parseInt(p.total_vandut) || 0} unități</strong>
                            </td>
                        </tr>
                    `).join('');
                })
                .catch(err => console.error("Eroare incarcare top produse:", err));
        });
    }

    // Închidere Modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    
    window.addEventListener('click', (e) => { 
        if(e.target === modal) modal.classList.remove('active'); 
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
        tableSearch.addEventListener('keyup', function() {
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