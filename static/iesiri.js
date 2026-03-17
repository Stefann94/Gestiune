// --- FUNCȚII DE UTILITATE ---

// 1. Filtrează produsele în funcție de compania selectată
function filterProductsByCompany() {
    const companySelect = document.getElementById('select_companie');
    const productSelect = document.getElementById('select_receptie');
    const qtyInput = document.getElementById('cantitate_iesire');
    const stocVizibil = document.getElementById('stoc_vizibil');
    const allData = document.querySelectorAll('.db-row');

    // Verificăm dacă elementele de bază există în pagină
    if (!companySelect || !productSelect) return;

    const selectedCompany = companySelect.value;

    // Resetăm dropdown-ul și valorile (cu verificare pentru fiecare)
    productSelect.innerHTML = '<option value="">-- Alege Produsul --</option>';
    productSelect.disabled = true;
    if (qtyInput) {
        qtyInput.value = '';
        qtyInput.placeholder = "0";
    }
    if (stocVizibil) stocVizibil.innerText = '0';

    if (!selectedCompany) return;

    let hasProducts = false;
    allData.forEach(row => {
        if (row.getAttribute('data-comp') === selectedCompany) {
            const opt = document.createElement('option');
            opt.value = row.getAttribute('data-id');
            opt.textContent = `${row.getAttribute('data-prod')} (Lot #${row.getAttribute('data-id')})`;
            opt.setAttribute('data-stoc', row.getAttribute('data-qty'));
            productSelect.appendChild(opt);
            hasProducts = true;
        }
    });

    if (hasProducts) productSelect.disabled = false;
}

// 2. Logică Submit (Trimitere către Server)
const exitForm = document.getElementById('exitForm');
if (exitForm) {
    exitForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const receptieId = document.getElementById('select_receptie')?.value;
        const cantitate = document.getElementById('cantitate_iesire')?.value;

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
}

// 3. Funcție pentru validarea cantității în timp real
function validateQuantity() {
    const input = document.getElementById('cantitate_iesire');
    if (!input) return;

    const maxStoc = parseInt(input.getAttribute('max')) || 0;
    const valoareIntrodusa = parseInt(input.value) || 0;
    const stocAfisaj = document.getElementById('stoc_vizibil');
    const submitBtn = document.querySelector('#exitForm button[type="submit"]');

    if (valoareIntrodusa > maxStoc) {
        if (stocAfisaj) {
            stocAfisaj.style.color = "#ff4444";
            stocAfisaj.innerHTML = maxStoc + " (Cantitate prea mare!)";
        }
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.5";
        }
    } else if (valoareIntrodusa <= 0 && input.value !== "") {
        if (submitBtn) submitBtn.disabled = true;
    } else {
        if (stocAfisaj) {
            stocAfisaj.style.color = "#059669";
            stocAfisaj.innerText = maxStoc;
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
        }
    }
}

// 4. Actualizează limita maximă când alegi un produs
function updateMaxQuantity() {
    const productSelect = document.getElementById('select_receptie');
    if (!productSelect) return;

    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const qtyInput = document.getElementById('cantitate_iesire');
    const stocVizibil = document.getElementById('stoc_vizibil');

    if (selectedOption && selectedOption.value !== "") {
        const maxStoc = selectedOption.getAttribute('data-stoc');
        if (stocVizibil) stocVizibil.innerText = maxStoc;
        if (qtyInput) {
            qtyInput.max = maxStoc;
            qtyInput.placeholder = "Maxim: " + maxStoc;
            qtyInput.value = ""; 
        }
        validateQuantity(); 
    } else {
        if (stocVizibil) stocVizibil.innerText = '0';
        if (qtyInput) qtyInput.placeholder = "0";
    }
}

// --- LOGICĂ MODAL ---
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.style.display = 'none';
        event.target.classList.remove('active');
    }
});

// --- INITIALIZARE EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', function() {
    const qtyInput = document.getElementById('cantitate_iesire');
    if (qtyInput) {
        qtyInput.addEventListener('input', validateQuantity);
    }

    // Inițializare grafic doar dacă suntem pe pagina unde există canvas-ul
    if (document.getElementById('topProductsValueChart')) {
        initTopProductsValueChart();
    }
});

// --- RESTUL FUNCȚIILOR (HISTORY & CHART) ---
let allExits = []; 

async function openExitHistory() {
    const companySelect = document.getElementById("hist_exit_companie");
    if (!companySelect) return;

    companySelect.innerHTML = '<option value="">-- Toate Companiile --</option>';
    if (document.getElementById("hist_exit_produs")) document.getElementById("hist_exit_produs").disabled = true;
    if (document.getElementById("exit_detail_card")) document.getElementById("exit_detail_card").style.display = "none";

    try {
        const response = await fetch("/api/iesiri/list");
        const result = await response.json();

        if (result.success) {
            allExits = result.data;
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
    const companySelect = document.getElementById("hist_exit_companie");
    const productSelect = document.getElementById("hist_exit_produs");
    if (!companySelect || !productSelect) return;

    const selectedComp = companySelect.value;
    productSelect.innerHTML = '<option value="">-- Selectează Produsul/Data --</option>';
    if (document.getElementById("exit_detail_card")) document.getElementById("exit_detail_card").style.display = "none";

    if (!selectedComp) {
        productSelect.disabled = true;
        return;
    }

    const filtered = allExits.filter(e => e.nume_companie === selectedComp);
    filtered.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.id;
        opt.textContent = `${e.nume_produs} (${e.data} - ${e.ora})`;
        productSelect.appendChild(opt);
    });
    productSelect.disabled = false;
}

function loadExitDetails() {
    const productSelect = document.getElementById("hist_exit_produs");
    if (!productSelect) return;

    const selectedId = productSelect.value;
    if (!selectedId) return;

    const data = allExits.find(e => e.id == selectedId);
    if (!data) return;

    if (document.getElementById("hist_exit_title")) document.getElementById("hist_exit_title").innerText = `Ieșire: ${data.nume_produs}`;
    if (document.getElementById("hist_exit_data")) document.getElementById("hist_exit_data").innerText = `${data.data} | ${data.ora}`;
    if (document.getElementById("hist_exit_qty")) document.getElementById("hist_exit_qty").innerText = `- ${data.cantitate_iesita} unități`;
    if (document.getElementById("hist_exit_lot")) document.getElementById("hist_exit_lot").innerText = `Lot #${data.receptie_id}`;
    if (document.getElementById("exit_detail_card")) document.getElementById("exit_detail_card").style.display = "block";
}

async function initTopProductsValueChart() {
    try {
        const response = await fetch('/api/iesiri/top-produse');
        const result = await response.json();

        if (!result.success || !result.data || result.data.length === 0) return;

        const labels = result.data.map(d => d.nume_companie);
        const values = result.data.map(d => Number(d.total_valoare));

        const canvas = document.getElementById('topProductsValueChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (window.myChartIesiri) window.myChartIesiri.destroy();

        window.myChartIesiri = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valoare Totală (RON)',
                    data: values,
                    backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
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
                        labels: { padding: 20, usePointStyle: true, font: { family: 'Plus Jakarta Sans', size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.raw.toLocaleString('ro-RO')} RON`;
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