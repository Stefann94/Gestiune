function filterByCategory(catId) {
    // Identificăm elementul care a declanșat evenimentul pentru a lua numele categoriei
    const card = event.currentTarget;
    const catName = card.querySelector('.value').innerText;
    document.getElementById('modalCategoryTitle').innerHTML = `<i class="fas fa-boxes"></i> ${catName}`;

    openModal('categoryProductsModal');

    const tbody = document.getElementById('categoryProductsBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Se încarcă...</td></tr>';

    fetch(`/api/produse/categorie/${catId}`)
        .then(response => response.json())
        .then(data => {
            tbody.innerHTML = ''; 

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nu există produse.</td></tr>';
                return;
            }

            data.forEach(prod => {
                const row = document.createElement('tr');
                
                // Alertă vizuală pentru stoc zero
                const stockStyle = prod.stock <= 0 ? 'color: #ef4444; font-weight: 800;' : 'font-weight: 600;';
                const skuDisplay = prod.sku ? prod.sku : '<span style="opacity:0.5;">Fără SKU</span>';

                row.innerHTML = `
                    <td style="font-family: monospace; font-size: 0.85rem; color: #64748b;">${skuDisplay}</td>
                    <td><strong>${prod.name}</strong></td>
                    <td class="text-center">${parseFloat(prod.price).toFixed(2)} RON</td>
                    <td class="text-right" style="${stockStyle}">${prod.stock} buc</td>
                `;
                tbody.appendChild(row);
            });
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Eroare server.</td></tr>';
        });
}