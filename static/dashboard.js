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
                        backgroundColor: '#ff0008', // Verde
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