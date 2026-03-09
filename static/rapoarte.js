/**
 * RAPOARTE.JS - Generare sumare și exporturi
 */

function openReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.style.display = 'flex'; // IMPORTANT: flex, nu block
        toggleParentScroll(true); 
        generateReportData();
    }
}

function closeReportsModal() {
    document.getElementById('reportsModal').style.display = 'none';
    toggleParentScroll(false); // <--- DEBLOCĂM PAGINA
}

function generateReportData() {
    const rows = document.querySelectorAll('#inventoryTableBody .product-row');
    const tableBody = document.getElementById('reportsTableBody');
    tableBody.innerHTML = ''; // Curățăm tabelul vechi

    let totalShortage = 0;
    let totalSurplus = 0;
    let syncedCount = 0;

    rows.forEach(row => {
        const name = row.querySelector('.editable-name').textContent;
        const sku = row.querySelector('.editable-sku').textContent;
        const status = row.getAttribute('data-status');
        const diff = parseInt(row.querySelector('.status-indicator').textContent.match(/-?\d+/) || 0);

        // Calculăm statisticile pentru carduri
        if (status === 'shortage') totalShortage += Math.abs(diff);
        else if (status === 'surplus') totalSurplus += diff;
        else syncedCount++;

        // Adăugăm rândul în tabelul de raport
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${name}</strong></td>
            <td><code>${sku}</code></td>
            <td><span class="status-indicator ${status}">${status.toUpperCase()}</span></td>
            <td class="text-center">${diff > 0 ? '+' + diff : diff}</td>
        `;
        tableBody.appendChild(tr);
    });

    // Actualizăm cardurile de sus
    document.getElementById('rep-total-items').textContent = rows.length;
    document.getElementById('rep-total-short').textContent = totalShortage;
    document.getElementById('rep-total-surplus').textContent = totalSurplus;
    document.getElementById('rep-total-ok').textContent = syncedCount;
}

async function exportData(format) {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generare...';
    
    try {
        const response = await fetch(`/rapoarte/export/${format}`);
        const data = await response.json();
        
        alert(`Succes: ${data.message}`);
    } catch (error) {
        alert("Eroare la export!");
    } finally {
        btn.innerHTML = originalText;
    }
}