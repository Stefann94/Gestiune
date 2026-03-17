// 1. Filtrează produsele în funcție de compania selectată
function filterProductsByCompany() {
    const selectedCompany = document.getElementById('select_companie').value;
    const productSelect = document.getElementById('select_receptie');
    const allData = document.querySelectorAll('.db-row');
    const qtyInput = document.getElementById('cantitate_iesire');
    const stocVizibil = document.getElementById('stoc_vizibil');

    // Resetăm dropdown-ul de produse și valorile de afișare
    productSelect.innerHTML = '<option value="">-- Alege Produsul --</option>';
    productSelect.disabled = true;
    qtyInput.value = '';
    qtyInput.placeholder = "0";
    stocVizibil.innerText = '0';

    if (!selectedCompany) return;

    // Populăm dropdown-ul doar cu produsele care aparțin companiei selectate
    let hasProducts = false;
    allData.forEach(row => {
        if (row.getAttribute('data-comp') === selectedCompany) {
            const opt = document.createElement('option');
            opt.value = row.getAttribute('data-id'); // ID-ul recepției din DB
            opt.textContent = `${row.getAttribute('data-prod')} (Lot #${row.getAttribute('data-id')})`;
            
            // Stocăm datele pe atributul option pentru updateMaxQuantity
            opt.setAttribute('data-stoc', row.getAttribute('data-qty'));
            productSelect.appendChild(opt);
            hasProducts = true;
        }
    });

    if (hasProducts) {
        productSelect.disabled = false;
    }
}

// 2. Actualizează limita maximă și afișajul când alegi un produs specific
function updateMaxQuantity() {
    const productSelect = document.getElementById('select_receptie');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const qtyInput = document.getElementById('cantitate_iesire');
    const stocVizibil = document.getElementById('stoc_vizibil');

    if (selectedOption && selectedOption.value !== "") {
        const maxStoc = selectedOption.getAttribute('data-stoc');
        stocVizibil.innerText = maxStoc;
        qtyInput.max = maxStoc;
        qtyInput.placeholder = "Maxim: " + maxStoc;
    } else {
        stocVizibil.innerText = '0';
        qtyInput.placeholder = "0";
    }
}

// 3. Logică Submit (Trimitere către Server)
document.getElementById('exitForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const receptieId = document.getElementById('select_receptie').value;
    const cantitate = document.getElementById('cantitate_iesire').value;

    if (!receptieId || !cantitate) {
        alert("Vă rugăm să selectați un produs și o cantitate validă.");
        return;
    }

    const data = {
        receptie_id: receptieId,
        cantitate: parseInt(cantitate)
    };

    try {
        const response = await fetch('/api/iesiri/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            alert("Ieșire înregistrată! Stocul a fost actualizat.");
            location.reload();
        } else {
            alert("Eroare: " + result.message);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("A apărut o eroare la comunicarea cu serverul.");
    }
});

// 4. Funcții Modal
function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('active');
    modal.style.display = 'none';
}

// Închidere la click în afara modalului
window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        event.target.classList.remove('active');
    }
}

// Funcție nouă pentru validarea cantității în timp real
function validateQuantity() {
    const input = document.getElementById('cantitate_iesire');
    const maxStoc = parseInt(input.getAttribute('max')) || 0;
    const valoareIntrodusa = parseInt(input.value) || 0;
    const stocAfisaj = document.getElementById('stoc_vizibil');
    const submitBtn = document.querySelector('#exitForm button[type="submit"]');

    if (valoareIntrodusa > maxStoc) {
        stocAfisaj.style.color = "#ff4444"; // Roșu dacă e prea mult
        stocAfisaj.innerHTML = maxStoc + " (Cantitate prea mare!)";
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
    } else if (valoareIntrodusa <= 0 && input.value !== "") {
        submitBtn.disabled = true;
    } else {
        stocAfisaj.style.color = "#059669"; // Verde dacă e OK
        stocAfisaj.innerText = maxStoc;
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
    }
}

// Adăugăm validarea la event listeners
document.getElementById('cantitate_iesire').addEventListener('input', validateQuantity);

// Modificăm puțin updateMaxQuantity să reseteze validarea la schimbarea produsului
function updateMaxQuantity() {
    const productSelect = document.getElementById('select_receptie');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const qtyInput = document.getElementById('cantitate_iesire');
    const stocVizibil = document.getElementById('stoc_vizibil');

    if (selectedOption && selectedOption.value !== "") {
        const maxStoc = selectedOption.getAttribute('data-stoc');
        stocVizibil.innerText = maxStoc;
        qtyInput.max = maxStoc;
        qtyInput.placeholder = "Maxim: " + maxStoc;
        qtyInput.value = ""; // Resetăm inputul când schimbă produsul
        validateQuantity(); 
    } else {
        stocVizibil.innerText = '0';
        qtyInput.placeholder = "0";
    }
}

// Restul funcțiilor (filterProductsByCompany, submit, modal) rămân la fel ca în răspunsul anterior


let allExits = []; // Cache pentru datele de ieșire

// Funcția apelată de butonul "Istoric Ieșiri" din Header
async function openExitHistory() {
    const companySelect = document.getElementById("hist_exit_companie");
    
    // Resetare UI
    companySelect.innerHTML = '<option value="">-- Toate Companiile --</option>';
    document.getElementById("hist_exit_produs").disabled = true;
    document.getElementById("exit_detail_card").style.display = "none";

    // Simulăm sau aducem datele din API-ul de ieșiri
    try {
        // Folosim datele trimise de Flask în variabila 'iesiri' din template 
        // Sau facem un fetch dacă ai endpoint dedicat:
        const response = await fetch("/api/iesiri/list"); // Asigură-te că ai acest endpoint în app.py
        const result = await response.json();

        if (result.success) {
            allExits = result.data;

            // Companii unice care au avut ieșiri
            const companii = [...new Set(allExits.map(e => e.nume_companie))].sort();
            
            companii.forEach(comp => {
                const opt = document.createElement("option");
                opt.value = comp;
                opt.textContent = comp;
                companySelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Eroare la încărcare istoric ieșiri:", err);
    }

    openModal('historyModal');
}

function filterExitHistoryProducts() {
    const selectedComp = document.getElementById("hist_exit_companie").value;
    const productSelect = document.getElementById("hist_exit_produs");
    
    productSelect.innerHTML = '<option value="">-- Selectează Produsul/Data --</option>';
    document.getElementById("exit_detail_card").style.display = "none";

    if (!selectedComp) {
        productSelect.disabled = true;
        return;
    }

    const filtered = allExits.filter(e => e.nume_companie === selectedComp);
    
    filtered.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.id;
        // Afișăm numele produsului și data pentru a le deosebi
        opt.textContent = `${e.nume_produs} (${e.data} - ${e.ora})`;
        productSelect.appendChild(opt);
    });

    productSelect.disabled = false;
}

function loadExitDetails() {
    const selectedId = document.getElementById("hist_exit_produs").value;
    if (!selectedId) return;

    const data = allExits.find(e => e.id == selectedId);
    if (!data) return;

    // Populăm datele
    document.getElementById("hist_exit_title").innerText = `Ieșire: ${data.nume_produs}`;
    document.getElementById("hist_exit_data").innerText = `${data.data} | ${data.ora}`;
    document.getElementById("hist_exit_qty").innerText = `- ${data.cantitate_iesita} unități`;
    document.getElementById("hist_exit_lot").innerText = `Lot #${data.receptie_id}`;

    document.getElementById("exit_detail_card").style.display = "block";
}

async function initTopProductsValueChart() {
    try {
        // Apelăm endpoint-ul corect definit în Python
        const response = await fetch('/api/iesiri/top-produse');
        const result = await response.json();

        console.log("Date primite pentru grafic:", result);

        if (!result.success || !result.data || result.data.length === 0) {
            console.warn("Nu sunt date disponibile pentru grafic.");
            return;
        }

        // Mapăm datele: acum folosim 'nume_companie' și 'total_valoare'
        const labels = result.data.map(d => d.nume_companie);
        const values = result.data.map(d => Number(d.total_valoare));

        const canvas = document.getElementById('topProductsValueChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Distrugem instanța veche dacă există (pentru a evita suprapunerea la refresh)
        if (window.myChart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valoare Totală (RON)',
                    data: values,
                    backgroundColor: [
                        '#6366f1', // Indigo
                        '#10b981', // Emerald
                        '#f59e0b', // Amber
                        '#ef4444', // Red
                        '#8b5cf6', // Violet
                        '#06b6d4'  // Cyan
                    ],
                    borderWidth: 0,
                    hoverOffset: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                family: 'Plus Jakarta Sans',
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                return ` ${context.label}: ${value.toLocaleString('ro-RO')} RON`;
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Eroare la inițializarea graficului:", error);
    }
}

// Inițializare la încărcarea paginii
document.addEventListener('DOMContentLoaded', initTopProductsValueChart);