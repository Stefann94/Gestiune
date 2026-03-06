// Funcție pentru afișarea notificării premium
function showToast(message, type = 'success') {
    // Creăm containerul dacă nu există
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Eliminăm notificarea după 3 secunde
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

document.getElementById('addProductForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const btn = this.querySelector('.btn-save');
    btn.classList.add('loading');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Se salvează...';

    const formData = new FormData(this);

    fetch('/produse/nou', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success") {
            showToast("Produsul a fost adăugat cu succes!");
            
            // Așteptăm puțin să vadă omul confirmarea, apoi închidem și dăm refresh
            setTimeout(() => {
                closeModal();
                location.reload();
            }, 1500);
        } else {
            showToast(data.message, "error");
            btn.classList.remove('loading');
            btn.innerHTML = 'Confirmă Adăugarea';
        }
    })
    .catch(error => {
        showToast("Eroare de conexiune la server", "error");
        btn.classList.remove('loading');
        btn.innerHTML = 'Confirmă Adăugarea';
    });
});