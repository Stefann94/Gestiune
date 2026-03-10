document.addEventListener('DOMContentLoaded', function() {
    // 1. Configurare Chart.js cu gradient și fonturi custom
    const ctx = document.getElementById('polarChart').getContext('2d');
    
    // Gradient pentru un efect vizual deosebit
    const chart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['Electronice', 'Periferice', 'Software', 'Retelistica', 'Accesorii'],
            datasets: [{
                data: [18000, 12000, 25000, 8000, 5000],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(100, 116, 139, 0.7)'
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

    // 2. Simulări UI
    console.log("Dashboard Premium inițializat...");
    
    // Exemplu de animație la hover pe carduri KPI
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = "translateY(-5px) scale(1.02)";
            card.style.transition = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = "translateY(0) scale(1)";
        });
    });
});