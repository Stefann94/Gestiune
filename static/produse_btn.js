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

// Funcția de Search pentru Categorii
function searchCategories() {
    let input = document.getElementById('mainProductSearch').value.toLowerCase();
    let cards = document.querySelectorAll('.kpi-card'); // Selectează cardurile de categorii

    cards.forEach(card => {
        let name = card.querySelector('.value').innerText.toLowerCase();
        if (name.includes(input)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

// Logica pentru salvarea Categoriei Noi
document.getElementById('addCategoryForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const catName = document.getElementById('newCatName').value;

    fetch('/api/categorii/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Categorie adăugată cu succes!');
                location.reload(); // Reîncărcăm pagina pentru a vedea noua categorie
            } else {
                alert('Eroare: ' + data.message);
            }
        })
        .catch(err => console.error('Error:', err));
});

// 1. Deschide primul modal și încarcă categoriile în dropdown
function prepareDeleteModal() {
    const dropdown = document.getElementById('deleteCatDropdown');
    dropdown.innerHTML = '<option value="">Se încarcă...</option>';

    // Folosim lista de carduri deja existentă pe pagină pentru a popula dropdown-ul rapid
    // sau poți face un fetch nou. Aici extragem din cardurile vizibile:
    const cards = document.querySelectorAll('.kpi-card');
    dropdown.innerHTML = '<option value="" disabled selected>Selectează categoria...</option>';

    cards.forEach(card => {
        const id = card.getAttribute('onclick').match(/\d+/)[0]; // Extrage ID-ul din onclick="filterByCategory(ID)"
        const name = card.querySelector('.value').innerText;
        dropdown.innerHTML += `<option value="${id}">${name}</option>`;
    });

    openModal('deleteCategoryModal');
}

// 2. Deschide modalul de confirmare
function showConfirmDelete() {
    const selectedId = document.getElementById('deleteCatDropdown').value;
    if (!selectedId) {
        alert("Te rugăm să selectezi o categorie!");
        return;
    }
    openModal('confirmDeleteModal');
}

// 3. Execută ștergerea prin API
function executeDelete() {
    const catId = document.getElementById('deleteCatDropdown').value;

    fetch(`/api/categorii/delete/${catId}`, {
        method: 'DELETE'
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Categoria și produsele aferente au fost șterse.');
                location.reload();
            } else {
                alert('Eroare la ștergere: ' + data.message);
            }
        })
        .catch(err => console.error('Error:', err));
}

function showConfirmDelete() {
    const selectedId = document.getElementById('deleteCatDropdown').value;
    if (!selectedId) {
        alert("Te rugăm să selectezi o categorie mai întâi!");
        return;
    }

    // Afișăm modalul de confirmare
    const confirmModal = document.getElementById('confirmDeleteModal');
    confirmModal.style.display = 'flex';
}

// Funcție universală de închidere (asigură-te că o ai)
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}