document.addEventListener('DOMContentLoaded', function () {

    // --- 0. LOGICĂ REDIRECȚIONARE ȘI MODAL AUTOMAT (DIN INVENTAR) ---
    if (localStorage.getItem('openUrgenteModal') === 'true') {
        setTimeout(() => {
            if (typeof openFixStocModal === 'function') {
                console.log("Redirecționare directă către Fixare Stoc & Audit...");
                openFixStocModal();
            } else {
                const fixModal = document.getElementById('fixStocModal');
                if (fixModal) {
                    fixModal.style.display = 'flex';
                    fixModal.classList.add('active');
                    document.body.classList.add('modal-open');
                    if (typeof incarcaDateFixStoc === 'function') incarcaDateFixStoc();
                }
            }
            localStorage.removeItem('openUrgenteModal');
        }, 500);
    }

    // --- 1. CONFIGURARE GRAFIC POLAR (Top Performanță Mix) ---
    const ctx = document.getElementById('polarChart').getContext('2d');
    let myChart; 

    function initChart(labels, values) {
        if (myChart) {
            myChart.destroy(); 
        }

        myChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.7)', // Emerald
                        'rgba(245, 158, 11, 0.7)', // Gold
                        'rgba(99, 102, 241, 0.7)', // Indigo
                        'rgba(239, 68, 68, 0.7)',  // Rose
                        'rgba(14, 165, 233, 0.7)', // Sky
                        'rgba(139, 92, 246, 0.7)', // Purple
                        'rgba(236, 72, 153, 0.7)', // Pink
                        'rgba(20, 184, 166, 0.7)'  // Teal
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { display: false },
                        suggestedMin: 0
                    }
                },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                            color: '#334155'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` Scor Performanță: ${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                }
            }
        });
    }

    function refreshTopPerformanceChart() {
        fetch('/api/stats/top-performanta-mix')
            .then(res => res.json())
            .then(data => {
                initChart(data.labels, data.values);
            })
            .catch(err => console.error("Eroare la preluarea datelor:", err));
    }

    refreshTopPerformanceChart();

    // --- 2. LOGICĂ MODAL ANALIZĂ (Card Valoare Inventar) ---
    const cardValoare = document.querySelector('.kpi-card.glass:first-child');
    const modal = document.getElementById('valoareModal');
    const closeBtn = document.querySelector('.close-modal');

    if (cardValoare) {
        cardValoare.style.cursor = "pointer";
        cardValoare.addEventListener('click', () => {
            if(modal) {
                modal.classList.add('active');
                modal.style.display = 'flex';
                document.body.classList.add('modal-open');

                fetch('/api/stats/top-produse')
                    .then(res => res.json())
                    .then(data => {
                        const listaScumpe = document.getElementById('listaScumpe');
                        const listaVandute = document.getElementById('listaVandute');

                        if (data.scumpe && data.scumpe.length > 0) {
                            listaScumpe.innerHTML = data.scumpe.map(p => `
                                <tr>
                                    <td><strong>${p.name}</strong></td>
                                    <td class="text-right">
                                        <strong class="text-gold">${parseFloat(p.price).toFixed(2)} RON</strong>
                                    </td>
                                </tr>
                            `).join('');
                        }

                        if (data.vandute && data.vandute.length > 0) {
                            listaVandute.innerHTML = data.vandute.map(p => {
                                const total = parseInt(p.total_vandut) || 0;
                                return `
                                    <tr>
                                        <td><strong>${p.name}</strong></td>
                                        <td class="text-right">
                                            <strong class="text-orange" style="font-size: 1.1rem;">
                                                ${total} <small style="font-weight: 400; font-size: 0.8rem; color: #64748b;">unități</small>
                                            </strong>
                                        </td>
                                    </tr>
                                `;
                            }).join('');
                        }
                    })
                    .catch(err => console.error("Eroare incarcare top produse:", err));
            }
        });
    }

    function closeModal() {
        if(modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });


    // --- 3. UI ANIMATIONS & FILTERS ---
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = "translateY(-5px) scale(1.02)";
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = "translateY(0) scale(1)";
        });
    });

    // --- 4. SCALARE DINAMICĂ FONT VALOARE INVENTAR ---
    const invElement = document.getElementById('totalInventoryValue');
    if (invElement) {
        const textValue = invElement.innerText.replace('RON', '').trim();
        const charCount = textValue.length;
        invElement.classList.remove('val-medium', 'val-small');
        if (charCount > 12) { 
            invElement.classList.add('val-small');
        } else if (charCount > 8) { 
            invElement.classList.add('val-medium');
        }
    }

// --- 5. BULK OPERATIONS CU MODAL PERSONALIZAT ---
(function() {
    const applyBtn = document.getElementById('applyBulkPrice');
    const bulkModal = document.getElementById('confirmBulkModal');
    const cancelBtn = document.getElementById('cancelBulkBtn');
    const confirmBtn = document.getElementById('confirmBulkBtn');
    const percentInput = document.getElementById('bulkPricePercent');
    const messageDisplay = document.getElementById('confirmBulkMessage');

    let pendingPercent = 0;

    // Funcție pentru închidere modal bulk
    const closeBulkModal = () => {
        if (bulkModal) {
            bulkModal.style.display = 'none';
            bulkModal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    };

    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            if (!percentInput) return;
            
            const val = parseFloat(percentInput.value);
            
            // Validare: să fie număr și să nu fie zero
            if (isNaN(val) || val === 0) {
                alert("Te rugăm să introduci un procent valid (ex: 10 pentru adaos, -5 pentru reducere).");
                return;
            }

            pendingPercent = val;
            const tip = val > 0 ? "CREȘTI" : "SCADĂ";
            const culoare = val > 0 ? "#10b981" : "#ef4444"; // Verde pentru creștere, Roșu pentru scădere

            if (messageDisplay && bulkModal) {
                messageDisplay.innerHTML = `Ești sigur că vrei să <strong style="color: ${culoare}">${tip}</strong> prețurile cu <strong>${Math.abs(val)}%</strong> pentru TOATE produsele din baza de date?`;
                
                // Resetăm butonul de confirmare în caz că a rămas blocat anterior
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Da, Aplică';

                // Afișare modal
                bulkModal.style.display = 'flex';
                setTimeout(() => {
                    bulkModal.classList.add('active');
                }, 10);
                document.body.classList.add('modal-open');
            }
        });
    }

    // Event listener pentru butonul Anulează
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeBulkModal);
    }

    // Event listener pentru confirmare și trimitere către server
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async function() {
            // Prevenim dubla trimitere și arătăm starea de încărcare
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Se aplică...';

            try {
                const response = await fetch('/api/bulk-price-update', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({ percent: pendingPercent })
                });

                if (!response.ok) throw new Error("Eroare la nivel de server");

                const result = await response.json();

                if (result.status === 'success') {
                    // Reîncărcăm pagina pentru a actualiza cardurile KPI (Valoare Inventar)
                    window.location.reload();
                } else {
                    alert("Eroare: " + (result.message || "Nu s-au putut actualiza prețurile."));
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = 'Da, Aplică';
                }
            } catch (error) {
                console.error("Eroare la cererea Bulk Update:", error);
                alert("Eroare de conexiune. Verifică dacă serverul este pornit.");
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Da, Aplică';
            }
        });
    }

    // Închidere modal la click în exteriorul cardului alb
    window.addEventListener('click', (e) => {
        if (e.target === bulkModal) closeBulkModal();
    });
})();

    console.log("Dashboard Master inițializat cu succes.");
});