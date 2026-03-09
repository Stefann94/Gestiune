/**
 * RAPOARTE.JS - Preluare date din DB și Export
 */

async function openReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        // 1. Afișăm modalul
        modal.style.display = 'flex';
        
        // 2. Blocăm scroll-ul pe pagina principală
        document.body.classList.add('modal-open');

        // 3. Resetăm tabelul cu un mesaj de încărcare
        const tableBody = document.getElementById('reportsTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding: 2rem;">
                    <i class="fas fa-spinner fa-spin"></i> Se încarcă datele din baza de date...
                </td>
            </tr>`;

        // 4. Preluăm datele proaspete din API
        await refreshReportsData();
    }
}

function closeReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.style.display = 'none';
        // Deblocăm scroll-ul paginii
        document.body.classList.remove('modal-open');
    }
}

async function refreshReportsData() {
    try {
        // Apelăm endpoint-ul de Python creat anterior
        const response = await fetch('/api/stats/reports');
        if (!response.ok) throw new Error("Eroare la comunicarea cu serverul");
        
        const data = await response.json();

        // --- A. ACTUALIZARE CARDURI STATISTICE ---
        document.getElementById('rep-total-items').textContent = data.stats.total_items || 0;
        document.getElementById('rep-total-ok').textContent = data.stats.total_ok || 0;
        document.getElementById('rep-total-short').textContent = data.stats.total_shortage || 0;
        document.getElementById('rep-total-surplus').textContent = data.stats.total_surplus || 0;

        // --- B. ACTUALIZARE TABEL ---
        const tableBody = document.getElementById('reportsTableBody');
        tableBody.innerHTML = ''; // Curățăm mesajul de încărcare

        if (data.products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Nu există produse în bază.</td></tr>';
            return;
        }

        data.products.forEach(p => {
            const status = p.last_audit_status || 'synced';
            const diff = p.last_audit_diff || 0;
            
            // Mapăm statusul intern în text prietenos
            const statusLabels = {
                'shortage': 'LIPSĂ',
                'surplus': 'SURPLUS',
                'synced': 'OK'
            };

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.name}</strong></td>
                <td><code>${p.sku}</code></td>
                <td><span class="status-indicator ${status}">${statusLabels[status] || 'OK'}</span></td>
                <td class="text-center"><strong>${diff > 0 ? '+' + diff : diff}</strong></td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (error) {
        console.error("Eroare la preluarea datelor:", error);
        document.getElementById('reportsTableBody').innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color: red; padding: 1rem;">
                    <i class="fas fa-exclamation-triangle"></i> Eroare: Nu s-au putut prelua datele.
                </td>
            </tr>`;
    }
}

async function exportData(format) {
    // Luăm butonul pentru feedback vizual
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Se descarcă...';
    
    try {
        console.log(`Cerere export pentru formatul: ${format}`);
        const response = await fetch(`/rapoarte/export/${format}`);
        
        if (!response.ok) throw new Error("Serverul a returnat o eroare");

        // IMPORTANT: Citim ca BLOB, nu ca JSON
        const blob = await response.blob();
        
        // Creăm un obiect URL pentru fișierul primit
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Setăm numele fișierului
        const extensie = format === 'excel' ? 'xlsx' : 'pdf';
        a.download = `Raport_Audit_${new Date().getTime()}.${extensie}`;
        
        // Declanșăm descărcarea
        document.body.appendChild(a);
        a.click();
        
        // Curățenie
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error("Eroare la export:", error);
        alert("Fișierul a fost generat, dar browser-ul nu l-a putut descărca.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}