document.addEventListener('DOMContentLoaded', function() {
    // 1. Configurare Grafic Polar Area
    const ctx = document.getElementById('polarChart').getContext('2d');
    
    // Date de test (le vom înlocui ulterior cu fetch din Python)
    const dataCategorii = {
        labels: ['Electronice', 'Electrocasnice', 'Birotică', 'Gadgets', 'Altele'],
        datasets: [{
            label: 'Valoare Stoc (RON)',
            data: [12000, 7500, 3000, 5000, 2000],
            backgroundColor: [
                'rgba(52, 152, 219, 0.7)',  // Albastru
                'rgba(231, 76, 60, 0.7)',   // Roșu
                'rgba(46, 204, 113, 0.7)',  // Verde
                'rgba(241, 196, 15, 0.7)',  // Galben
                'rgba(155, 89, 182, 0.7)'   // Mov
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    };

    const polarChart = new Chart(ctx, {
        type: 'polarArea',
        data: dataCategorii,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    grid: { color: '#ddd' },
                    ticks: { display: false } // Ascundem numerele brute pentru un aspect curat
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, font: { size: 14 } }
                }
            }
        }
    });

    // 2. Interactivitate: Salvare Stoc Minim (Quick Edit)
    const saveButtons = document.querySelectorAll('.btn-save');
    
    saveButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const productName = row.cells[0].innerText;
            const newMinStock = row.querySelector('.input-edit').value;

            // Simulare apel API
            console.log(`Salvare pentru ${productName}: Stoc minim nou = ${newMinStock}`);
            
            // Efect vizual de succes
            this.innerText = '✅ OK';
            this.style.background = '#2ecc71';
            
            setTimeout(() => {
                this.innerText = 'Salvează';
                this.style.background = '#3498db';
            }, 2000);
            
            // Aici vei adăuga ulterior: 
            // fetch('/update-min-stock', { method: 'POST', body: ... })
        });
    });

    // 3. Interactivitate: Ajustare Preț Global
    const btnApplyPrice = document.querySelector('.btn-primary');
    btnApplyPrice.addEventListener('click', function() {
        const percent = this.previousElementSibling.value;
        if(percent) {
            alert(`Se aplică o modificare de ${percent}% asupra prețurilor din baza de date...`);
            // Logica de backend va veni aici
        }
    });
});