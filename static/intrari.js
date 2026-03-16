// ===============================
// CALCUL PRET TOTAL LIVE
// ===============================

function calculateTotal() {

    const qty = parseFloat(document.getElementById('cantitate').value) || 0;
    const price = parseFloat(document.getElementById('pret_produs').value) || 0;

    const total = qty * price;

    document.getElementById('pret_total').value = total.toFixed(2) + " RON";
}


// ===============================
// SUBMIT FORMULAR
// ===============================

document.getElementById('entryForm').addEventListener('submit', async function (e) {

    e.preventDefault();

    const formData = {

        nume_companie: document.getElementById('nume_companie').value.trim(),

        nume_produs: document.getElementById('nume_produs').value.trim(),

        cantitate: parseFloat(document.getElementById('cantitate').value),

        pret_produs: parseFloat(document.getElementById('pret_produs').value),

        email_firma: document.getElementById('email_firma').value.trim(),

        adresa_firma: document.getElementById('adresa_firma').value.trim()
    };


    try {

        const response = await fetch('/api/receptii/add', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(formData)

        });


        const result = await response.json();


        if (result.success) {

            alert("Recepția a fost salvată cu succes!");

            document.getElementById('entryForm').reset();

            document.getElementById('pret_total').value = "";

            closeModal('entryModal');

            location.reload();

        } else {

            alert("Eroare: " + result.message);

        }

    } catch (error) {

        console.error("Server error:", error);

        alert("A apărut o eroare la comunicarea cu serverul.");

    }

});

async function openReceptionHistory() {

    const modal = document.getElementById("historyModal");
    const list = document.getElementById("receptiiList");

    list.innerHTML = "";

    try {

        const response = await fetch("/api/receptii/list");

        const result = await response.json();

        if (result.success) {

            result.data.forEach(r => {

                const btn = document.createElement("button");

                btn.className = "receptie-btn";

                btn.innerHTML = `
                Compania: <strong>${r.nume_companie}</strong><br>
                Produsul: <strong>${r.nume_produs}</strong>
                `;

                btn.onclick = () => showReceptionDetails(r);

                list.appendChild(btn);

            });

        }

    } catch (err) {

        console.error(err);

    }

    modal.style.display = "flex";

}



function showReceptionDetails(data) {

    document.getElementById("detail_companie").textContent = data.nume_companie;
    document.getElementById("detail_produs").textContent = data.nume_produs;
    document.getElementById("detail_cantitate").textContent = data.cantitate;
    document.getElementById("detail_pret_unitar").textContent = data.pret_produs + " RON";
    document.getElementById("detail_pret_total").textContent = data.pret_total + " RON";
    document.getElementById("detail_email").textContent = data.email_firma;
    document.getElementById("detail_adresa").textContent = data.adresa_firma;

    document.getElementById("receptionDetailsModal").style.display = "flex";

}

async function initSupplierChart() {
    const canvas = document.getElementById('supplierChart');
    if (!canvas) return;

    try {
        const response = await fetch('/api/receptii/grafic-date');
        const result = await response.json();

        if (result.success) {
            // Extragem etichetele (numele firmelor) și valorile (sumele)
            const labels = result.data.map(item => item.nume_companie);
            const values = result.data.map(item => item.total);

            const ctx = canvas.getContext('2d');

            // Distrugem graficul vechi dacă există (pentru a evita suprapunerea la refresh)
            if (window.mySupplierChart) window.mySupplierChart.destroy();

            window.mySupplierChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Achiziții (RON)',
                        data: values,
                        backgroundColor: '#10b981',
                        borderRadius: 6, // colțuri rotunjite
                        borderSkipped: false,
                        barPercentage: 0.6 // bare mai subțiri, spațiu mai aerisit
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            yAlign: 'bottom',
                            titleFont: { size: 14, weight: '600' },
                            bodyFont: { size: 12 },
                            padding: 10,
                            cornerRadius: 8
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#e5e7eb' }, // gri deschis, modern
                            ticks: { padding: 8, stepSize: 5000 }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { padding: 8 }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error("Eroare la încărcarea graficului:", error);
    }
}

// Apelăm funcția când se încarcă pagina
document.addEventListener('DOMContentLoaded', initSupplierChart);