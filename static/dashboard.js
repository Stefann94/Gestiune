let stockChartInstance = null;

async function initDashboardCharts() {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;

    try {
        // Luăm datele reale de la ruta Flask creată mai sus
        const response = await fetch('/api/stats/stock-flow');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const realData = await response.json();

        // Evităm memory leak-ul (cel cu dinții de fierăstrău)
        if (stockChartInstance) {
            stockChartInstance.destroy();
        }

        const chartCtx = ctx.getContext('2d');
        const gradient = chartCtx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

        stockChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: realData.labels, // Din Python: ['Mon', 'Tue'...]
                datasets: [{
                    label: 'Produse Ieșite',
                    data: realData.values, // Din Python: [10, 25...]
                    borderColor: '#10b981',
                    borderWidth: 3,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#10b981',
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: gradient
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f3f4f6' },
                        ticks: { color: '#9ca3af' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af' }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Eroare la încărcarea graficului:", error);
        // Putem pune niște date "fallback" aici dacă serverul pică
    }
}