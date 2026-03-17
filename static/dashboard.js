let stockChartInstance = null;

async function initDashboardCharts() {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;

    try {
        const response = await fetch('/api/stats/stock-discrepancy');
        const data = await response.json();

        if (!data || data.length === 0) {
            console.warn("Nu sunt date pentru grafic.");
            return;
        }

        // --- FUNCȚIE PENTRU TĂIERE TEXT ---
        // Dacă numele are mai mult de 10 caractere, îl tăiem și punem ..
        const labels = data.map(item => {
            const name = item.name;
            return name.length > 10 ? name.substring(0, 10) + '..' : name;
        });

        const stocSistem = data.map(item => item.sistem);
        const stocFaptic = data.map(item => item.faptic);

        // Distrugem instanța veche dacă există, pentru a evita bug-urile vizuale
        if (stockChartInstance) {
            stockChartInstance.destroy();
        }

        stockChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Stoc Sistem',
                        data: stocSistem,
                        backgroundColor: '#006b29', // Verde
                        borderRadius: 4,
                        barPercentage: 0.9, // Face barele puțin mai subțiri și elegante
                    },
                    {
                        label: 'Stoc Faptic',
                        data: stocFaptic,
                        backgroundColor: '#10b981', // Roșu
                        borderRadius: 4,
                        barPercentage: 0.9,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                        ticks: { font: { family: 'Inter', size: 11 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            maxRotation: 0, // FORȚĂM textul să stea drept (orizontal)
                            minRotation: 0,
                            font: { family: 'Inter', size: 10, weight: '600' },
                            color: '#64748b'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: { 
                            usePointStyle: true, 
                            pointStyle: 'circle',
                            padding: 20,
                            font: { family: 'Inter', size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        titleFont: { size: 13 },
                        callbacks: {
                            // În tooltip afișăm numele întreg, chiar dacă jos e tăiat
                            title: (context) => data[context[0].dataIndex].name
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error("Eroare la încărcarea graficului:", err);
    }
}

async function refreshCriticalAlerts() {
    const container = document.querySelector('.critical-list');
    if (!container) return;

    try {
        const response = await fetch('/api/v1/internal/inventory-leakage-detector');
        const result = await response.json();

        if (result.status === 'success' && result.data.length > 0) {
            container.innerHTML = result.data.map(item => {
                // Calculăm procentul de umplere (cât avem din cât ar trebui să fie)
                const procent = (item.stock_faptic / item.stock_system * 100) || 0;
                
                return `
                <div class="critical-item">
                    <div class="item-info">
                        <strong>${item.name}</strong>
                        <span style="color: #ef4444; font-weight: 600;">
                            Raft: ${item.stock_faptic} / Sistem: ${item.stock_system}
                        </span>
                    </div>
                    <div class="progress-bar-mini">
                        <div class="progress-fill red" style="width: ${procent}%;"></div>
                    </div>
                </div>`;
            }).join('');
            
            // Actualizăm și badge-ul de sus cu numărul corect
            const badge = document.querySelector('.alerts-card .badge');
            if (badge) badge.textContent = `${result.count} Urgențe`;

        } else {
            container.innerHTML = `
                <div class="critical-item">
                    <div class="item-info">
                        <strong>Stoc Sincronizat</strong>
                        <span>Nu există discrepanțe negative în acest moment.</span>
                    </div>
                </div>`;
        }
    } catch (err) {
        console.error("Eroare la detectorul de scurgeri:", err);
    }
}

// Chemăm funcția când se încarcă dashboard-ul
document.addEventListener('DOMContentLoaded', refreshCriticalAlerts);