document.addEventListener('DOMContentLoaded', () => {
    
    // --- UTILS: Funcție helper pentru selectare și evenimente ---
    const $ = id => document.getElementById(id);
    const $$ = selector => document.querySelector(selector);

    // --- 0. LOGICĂ REDIRECȚIONARE ȘI MODAL AUTOMAT ---
    if (localStorage.getItem('openUrgenteModal') === 'true') {
        setTimeout(() => {
            if (typeof openFixStocModal === 'function') {
                openFixStocModal();
            } else {
                const fixModal = $('fixStocModal');
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

    // --- 1. CONFIGURARE GRAFIC POLAR ---
    let myChart;
    function initChart(labels, values) {
        const chartCanvas = $('polarChart');
        if (!chartCanvas) return;

        if (myChart) myChart.destroy();
        myChart = new Chart(chartCanvas.getContext('2d'), {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)', 
                        'rgba(99, 102, 241, 0.7)', 'rgba(239, 68, 68, 0.7)', 
                        'rgba(14, 165, 233, 0.7)', 'rgba(139, 92, 246, 0.7)', 
                        'rgba(236, 72, 153, 0.7)', 'rgba(20, 184, 166, 0.7)'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { display: false } } },
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } } },
                    tooltip: { callbacks: { label: (ctx) => ` Scor: ${ctx.raw.toLocaleString()}` } }
                }
            }
        });
    }

    const refreshTopPerformanceChart = () => {
        fetch('/api/stats/top-performanta-mix')
            .then(res => res.json())
            .then(data => initChart(data.labels, data.values))
            .catch(err => console.error("Eroare Chart:", err));
    };

    // --- 2. ACTUALIZARE VERIFICĂRI STOC (AJUSTĂRI) ---
    async function updateVerificariStoc() {
        try {
            const response = await fetch('/api/stats/stock-verificare');
            const data = await response.json();
            const listContainer = $$('.dead-stock-list');
            if (!listContainer) return;

            if (!data || data.length === 0) {
                listContainer.innerHTML = '<li style="justify-content: center; opacity: 0.6;">Stocuri aliniate</li>';
                return;
            }

            listContainer.innerHTML = data.map(item => `
                <li>
                    <div class="item-meta">
                        <strong>${item.name}</strong>
                        <span>Sist: ${item.sistem} | Fapt: ${item.faptic}</span>
                    </div>
                    <span class="action-tag" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
                        Dif: -${item.diferenta} buc
                    </span>
                </li>
            `).join('');
        } catch (err) { console.error("Eroare Listă Stoc:", err); }
    }

    // --- 3. MODAL ANALIZĂ VALOARE ---
    const cardValoare = $$('.kpi-card.glass:first-child');
    const valoareModal = $('valoareModal');

    if (cardValoare && valoareModal) {
        cardValoare.style.cursor = "pointer";
        cardValoare.addEventListener('click', () => {
            valoareModal.classList.add('active');
            valoareModal.style.display = 'flex';
            document.body.classList.add('modal-open');

            fetch('/api/stats/top-produse')
                .then(res => res.json())
                .then(data => {
                    if (data.scumpe) $('listaScumpe').innerHTML = data.scumpe.map(p => `<tr><td>${p.name}</td><td class="text-right"><strong class="text-gold">${parseFloat(p.price).toFixed(2)} RON</strong></td></tr>`).join('');
                    if (data.vandute) $('listaVandute').innerHTML = data.vandute.map(p => `<tr><td>${p.name}</td><td class="text-right"><strong class="text-orange">${parseInt(p.total_vandut) || 0} buc</strong></td></tr>`).join('');
                });
        });
    }

    // Închidere modal generică (Buton + Click Exterior)
    window.closeModal = function(id) {
        const m = $(id);
        if (m) {
            m.classList.remove('active');
            m.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    };

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay') || e.target.getAttribute('role') === 'dialog') {
            closeModal(e.target.id);
        }
    });

    // --- 4. BULK OPERATIONS ---
    const applyBtn = $('applyBulkPrice');
    const bulkModal = $('confirmBulkModal');
    let pendingPercent = 0;

    if (applyBtn && bulkModal) {
        applyBtn.addEventListener('click', () => {
            const val = parseFloat($('bulkPricePercent').value);
            if (isNaN(val) || val === 0) return alert("Introdu un procent valid.");
            
            pendingPercent = val;
            $('confirmBulkMessage').innerHTML = `Vrei să <strong style="color: ${val > 0 ? '#10b981' : '#ef4444'}">${val > 0 ? 'CREȘTI' : 'SCAZI'}</strong> prețurile cu <strong>${Math.abs(val)}%</strong>?`;
            bulkModal.style.display = 'flex';
            bulkModal.classList.add('active');
        });

        $('confirmBulkBtn').addEventListener('click', async function() {
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            try {
                const res = await fetch('/api/bulk-price-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ percent: pendingPercent })
                });
                if (res.ok) window.location.reload();
            } catch (e) { alert("Eroare server."); this.disabled = false; }
        });

        $('cancelBulkBtn').addEventListener('click', () => closeModal('confirmBulkModal'));
    }

    // --- INIȚIALIZĂRI ---
    refreshTopPerformanceChart();
    updateVerificariStoc();
    
    // UI: Hover Cards
    document.querySelectorAll('.kpi-card').forEach(card => {
        card.addEventListener('mouseenter', () => card.style.transform = "translateY(-5px) scale(1.01)");
        card.addEventListener('mouseleave', () => card.style.transform = "translateY(0) scale(1)");
    });
});