window.initCommonComponents = function () {

    const navbarHTML = `
<nav class="navbar">
<a href="/" class="logo-link">
<div class="logo">
<i class="fas fa-boxes"></i>
<span>StockMaster</span>
</div>
</a>

<ul class="nav-links">
<li><a href="/dashboard"><i class="fas fa-chart-line"></i><span>Dashboard</span></a></li>
<li><a href="/produse_btn"><i class="fas fa-box"></i><span>Produse</span></a></li>
<li><a href="/intrari"><i class="fas fa-arrow-down"></i><span>Intrări</span></a></li>
<li><a href="/iesiri"><i class="fas fa-arrow-up"></i><span>Ieșiri</span></a></li>
<li><a href="/furnizori"><i class="fas fa-truck"></i><span>Furnizori</span></a></li>
<li><a href="/rapoarte"><i class="fas fa-file-invoice"></i><span>Rapoarte</span></a></li>
<li><a href="javascript:void(0)" onclick="openEmployeesModal()"><i class="fas fa-users-cog"></i><span>Angajați</span></a></li>
</ul>

<div class="navbar-auth">

<div class="auth-buttons" id="authButtons">
<a href="#" class="btn-auth btn-login" id="openLogin">Log In</a>
<a href="#" class="btn-auth btn-signup" id="openSignup">Sign Up</a>
</div>

<div class="user-info" id="userInfo" style="display:none">
<span class="user-name">Salut, <strong id="loggedUser"></strong></span>
<button class="logout-btn" id="logoutBtn">
<i class="fas fa-sign-out-alt"></i>
Logout
</button>
</div>

</div>
</nav>

<div id="authModalOverlay" class="modal-overlay" style="display:none!important">
<div class="auth-modal-container">

<div class="inventory-header-brand">
<div class="header-text">
<h2 id="modalTitle"><i class="fas fa-user-lock"></i>Autentificare</h2>
<p id="modalSubtitle">Introdu datele pentru a continua</p>
</div>
<span class="close-auth-btn">&times;</span>
</div>

<div class="auth-modal-body">
<form id="authForm" onsubmit="event.preventDefault();">

<div class="form-group">
<label><i class="fas fa-envelope"></i>Email / Utilizator</label>
<input type="text" placeholder="ex: admin@stockmaster.ro" required>
</div>

<div class="form-group">
<label><i class="fas fa-key"></i>Parolă</label>
<input type="password" placeholder="••••••••" required>
</div>

<div id="signupFields" style="display:none">
<div class="form-group">
<label><i class="fas fa-signature"></i>Nume Complet</label>
<input type="text" placeholder="Popescu Ion">
</div>
</div>

<button type="submit" class="btn-modal-submit">Confirmă</button>

</form>
</div>

</div>
</div>

<div id="employeesModal" class="modal-overlay" style="display:none!important">
    <div class="emp-modal-container">
        <div class="inventory-header-brand">
            <div class="header-text">
                <h2><i class="fas fa-users-cog"></i> Management Echipă</h2>
                <p>Gestionarea rolurilor și permisiunilor</p>
            </div>
            <span class="close-emp-btn" onclick="closeEmployeesModal()">&times;</span>
        </div>

        <div class="emp-modal-body">
            <div class="employees-roles-grid">
                <div class="role-col">
                    <div class="role-badge new-user-bg"><i class="fas fa-user-clock"></i> ÎN AȘTEPTARE</div>
                    <div id="list-pending" class="emp-list-area"></div>
                </div>
                <div class="role-col">
                    <div class="role-badge operator-bg"><i class="fas fa-user-edit"></i> OPERATORI</div>
                    <div id="list-operators" class="emp-list-area"></div>
                </div>
                <div class="role-col">
                    <div class="role-badge admin-bg"><i class="fas fa-user-shield"></i> ADMINI</div>
                    <div id="list-admins" class="emp-list-area"></div>
                </div>
                <div class="role-col">
                    <div class="role-badge owner-bg"><i class="fas fa-crown"></i> OWNERI</div>
                    <div id="list-owners" class="emp-list-area"></div>
                </div>
            </div>
        </div>
    </div>
</div>
`.trim();

    const modalStyles = `
<style>
html { scrollbar-gutter: stable; }

.navbar { display: flex; align-items: center; padding: 0 2rem; }

.navbar-auth {
    margin-left: auto;
    padding-left: 2rem;
    display: flex;
    align-items: center;
}

.user-info { display: flex; align-items: center; gap: 1.5rem; flex-wrap: nowrap; }

.user-name {
    color: #6ee7b7;
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
}

.logout-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 0.5rem;
    padding: 0.5rem 0.8rem;
    font-weight: 600;
    font-size: 0.85rem;
    line-height: 1;
    cursor: pointer;
    width: auto; 
    min-width: fit-content;
    transition: all 0.2s ease;
}

.logout-btn:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.modal-overlay{
    display:none;
    position:fixed;
    inset:0;
    width:100%;
    height:100vh;
    background:rgba(0,0,0,.55);
    backdrop-filter:blur(.4rem);
    z-index:9999;
    justify-content:center;
    align-items:center;
    padding:2rem;
}

.auth-modal-container{
    width:100%;
    max-width:32rem;
    background:#fff;
    border-radius:1.4rem;
    overflow:hidden;
    box-shadow:0 2rem 4rem rgba(0,0,0,.35);
    animation:modalAppear .4s cubic-bezier(.165,.84,.44,1);
    display:flex;
    flex-direction:column;
}

.emp-modal-container {
    width:100%;
    max-width: 1000px;
    background: #fff;
    border-radius: 1.4rem;
    overflow: hidden;
    box-shadow: 0 2rem 4rem rgba(0,0,0,.35);
    animation: modalAppear .4s cubic-bezier(.165,.84,.44,1);
}

.emp-modal-body {
    padding: 1.5rem;
    max-height: 70vh;
    overflow-y: auto;
}

.employees-roles-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

.role-col {
    background: #f9fafb;
    border-radius: 0.8rem;
    border: 1px solid #e5e7eb;
    min-height: 300px;
}

.role-badge {
    padding: 0.7rem;
    text-align: center;
    color: white;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.5px;
}

.owner-bg { background: #064e3b; }
.admin-bg { background: #059669; }
.operator-bg { background: #10b981; }
.new-user-bg { background: #6b7280; }

.emp-list-area { padding: 1rem; }

/* Stil Carduri Angajați */
.emp-card {
    background: #ffffff;
    padding: 1rem;
    border-radius: 1rem;
    margin-bottom: 1rem;
    border: 1px solid #edf2f7;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    position: relative;
    overflow: hidden;
}
.emp-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border-color: #10b981;
}

.emp-info {
    display: flex;
    flex-direction: column;
}
.emp-card-name {
    color: #1a202c;
    font-weight: 700;
    font-size: 0.95rem;
    letter-spacing: -0.01em;
}
.emp-card-username {
    color: #718096;
    font-size: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
}
.emp-card-username::before {
    content: '@';
    color: #10b981;
    font-weight: bold;
}
.emp-actions {
    margin-top: 0.4rem;
}
.btn-promote {
    width: 100%;
    padding: 0.6rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    border-radius: 0.6rem;
    border: none;
    color: white;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
}

.btn-promote:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
    transform: scale(1.02);
}
.btn-promote:active {
    transform: scale(0.98);
}
    .btn-promote i {
    font-size: 0.8rem;
}

/* Diferențiere vizuală culori coloane */
#list-pending .btn-promote { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }
#list-pending .btn-promote:hover { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); }

#list-admins .btn-promote { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 6px rgba(217, 119, 6, 0.2); }
#list-admins .btn-promote:hover { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
.inventory-header-brand{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:1.6rem 2rem;
    background:#064e3b;
    color:#fff;
}

.header-text h2{ font-size:1.4rem; font-weight:700; margin:0; }
.header-text p{ margin:.3rem 0 0; font-size:.9rem; opacity:.85; }

.close-emp-btn, .close-auth-btn {
    font-size: 2rem;
    cursor: pointer;
    line-height: 1;
    transition: .2s;
}
.close-emp-btn:hover, .close-auth-btn:hover { color: #ef4444; }

.auth-modal-body{ padding:2.2rem; }
.form-group{ margin-bottom:1.4rem; display:flex; flex-direction:column; }
.form-group label{ display:flex; align-items:center; gap:.5rem; margin-bottom:.4rem; font-weight:600; font-size:.85rem; color:#374151; }
.form-group input{ width:100%; padding:.7rem .9rem; border-radius:.6rem; border:.12rem solid #e5e7eb; font-size:.95rem; line-height:1.3; box-sizing:border-box; transition:all .2s ease; min-height:2.6rem; }
.form-group input:focus{ border-color:#10b981; outline:none; box-shadow:0 0 0 .18rem rgba(16,185,129,.15); }
.btn-modal-submit{ width:100%; padding:.9rem; border-radius:.6rem; border:none; background:#10b981; color:#fff; font-weight:700; font-size:.95rem; cursor:pointer; transition:all .2s ease; margin-top:.5rem; }
.btn-modal-submit:hover{ background:#059669; transform:translateY(-.15rem); }

@keyframes modalAppear{
    from{opacity:0;transform:translateY(1.5rem)}
    to{opacity:1;transform:translateY(0)}
}

@media (max-width:48rem){
    .modal-overlay{padding:1.2rem;}
    .auth-modal-container, .emp-modal-container{max-width:100%;}
    .employees-roles-grid { grid-template-columns: 1fr; }
}
</style>
`;

    // Injectare HTML + CSS
    const target = document.getElementById("navbar-placeholder");
    if (target) target.innerHTML = navbarHTML + modalStyles;

    // Element Reference
    const overlay = document.getElementById("authModalOverlay");
    const empOverlay = document.getElementById("employeesModal");
    const authForm = document.getElementById("authForm");
    const signupFields = document.getElementById("signupFields");
    const authButtons = document.getElementById("authButtons");
    const userInfo = document.getElementById("userInfo");
    const loggedUser = document.getElementById("loggedUser");

    /* =========================
       LOGICA ANGAJATI (DB)
       ========================= */

    window.loadEmployees = async function () {
        const containers = {
            'pending': document.getElementById('list-pending'),
            'operator': document.getElementById('list-operators'),
            'admin': document.getElementById('list-admins'),
            'owner': document.getElementById('list-owners')
        };

        // Curățăm listele existente
        Object.values(containers).forEach(c => { if (c) c.innerHTML = ''; });

        try {
            // 1. Aflăm cine este utilizatorul logat (rolul lui)
            const sessionResp = await fetch('/api/get_current_session');
            const sessionData = await sessionResp.json();
            let myRole = 'guest';

            // dacă nu există utilizator salvat în localStorage => tratăm ca guest
            const savedUser = localStorage.getItem("stockmaster_user");

            if (savedUser && sessionData && sessionData.role) {
                myRole = sessionData.role.toLowerCase();
            }

            // 2. Luăm toți utilizatorii din baza de date
            const response = await fetch('/api/get_all_users_with_roles');
            const users = await response.json();

            users.forEach(user => {
                let userRole = (user.role || 'pending').toLowerCase().trim();
                const targetContainer = containers[userRole] || containers['pending'];

                if (targetContainer) {
                    const card = document.createElement('div');
                    card.className = 'emp-card';

                    // Calculăm ce rol ar urma dacă dăm click pe buton
                    let nextRole = '';
                    let btnText = '';
                    if (userRole === 'pending') { nextRole = 'operator'; btnText = 'Aprobă'; }
                    else if (userRole === 'operator') { nextRole = 'admin'; btnText = 'Promovează Admin'; }
                    else if (userRole === 'admin') { nextRole = 'owner'; btnText = 'Promovează Owner'; }

                    // --- LOGICA DE PERMISIUNI (Cine vede butonul?) ---
                    let canPromote = false;

                    // Dacă utilizatorul nu este logat sau este guest, canPromote rămâne false automat
                    if (myRole !== 'guest') {
                        if (myRole === 'owner') {
                            canPromote = true; // Ownerul poate face orice
                        } else if (myRole === 'admin' && userRole === 'pending') {
                            canPromote = true; // Adminul poate doar să aprobe useri noi
                        }
                    }

                    // Generăm HTML-ul cardului
                    // Cardul (numele și username-ul) apare MEREU
                    card.innerHTML = `
                    <div class="emp-info">
                        <span class="emp-card-name">${user.full_name || user.username}</span>
                        <small class="emp-card-username">@${user.username}</small>
                    </div>
                    ${(nextRole && canPromote) ? `
                    <div class="emp-actions">
                        <button class="btn-promote" onclick="changeUserRole(${user.id}, '${nextRole}')">
                            <i class="fas fa-arrow-up"></i> ${btnText}
                        </button>
                    </div>` : ''}
                `;

                    targetContainer.appendChild(card);
                }
            });
        } catch (err) {
            console.error("Eroare la încărcare angajați:", err);
        }
    };

    window.changeUserRole = async function (userId, newRole) {
        let endpoint = '/api/update_user_role'; // Default general

        // Alegem endpoint-ul specific pe care l-ai definit in Python
        if (newRole === 'operator') {
            endpoint = `/api/user/approve/${userId}`;
        } else if (newRole === 'admin') {
            endpoint = `/api/user/promote/${userId}`;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Trimitem body doar pentru update_user_role, celelalte folosesc ID-ul din URL
                body: (endpoint === '/api/update_user_role') ? JSON.stringify({ id: userId, role: newRole }) : null
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || "Acțiune realizată cu succes!");
                window.loadEmployees(); // Reîncărcăm listele pentru a vedea mutarea
            } else {
                alert("Eroare: " + (result.message || "Nu ai permisiunea necesară."));
            }
        } catch (err) {
            console.error(err);
            alert("Serverul nu a răspuns corect.");
        }
    };

    window.openEmployeesModal = function () {
        if (!empOverlay) return;
        empOverlay.style.setProperty("display", "flex", "important");
        document.body.style.overflow = "hidden";
        window.loadEmployees();
    };

    window.closeEmployeesModal = function () {
        if (!empOverlay) return;
        empOverlay.style.setProperty("display", "none", "important");
        document.body.style.overflow = "auto";
    };

    /* =========================
       LOGICA AUTH (LOGIN/SIGNUP)
       ========================= */

    function checkLogin() {
        const savedUser = localStorage.getItem("stockmaster_user");
        if (savedUser) {
            authButtons.style.display = "none";
            userInfo.style.display = "flex";
            loggedUser.textContent = savedUser;
        }
    }

    checkLogin();

    function openModal(type) {
        if (!overlay) return;
        overlay.style.setProperty("display", "flex", "important");
        document.body.style.overflow = "hidden";

        const modalTitle = document.getElementById("modalTitle");
        const modalSubtitle = document.getElementById("modalSubtitle");

        if (type === "login") {
            modalTitle.innerHTML = '<i class="fas fa-user-lock"></i>Autentificare';
            modalSubtitle.innerText = "Acces rapid în panoul de control";
            signupFields.style.display = "none";
        } else {
            modalTitle.innerHTML = '<i class="fas fa-user-plus"></i>Cont Nou';
            modalSubtitle.innerText = "Alătură-te echipei StockMaster";
            signupFields.style.display = "block";
        }
    }

    function closeModal() {
        overlay.style.setProperty("display", "none", "important");
        document.body.style.overflow = "auto";
    }

    document.getElementById("openLogin")?.addEventListener("click", e => {
        e.preventDefault();
        openModal("login");
    });

    document.getElementById("openSignup")?.addEventListener("click", e => {
        e.preventDefault();
        openModal("signup");
    });

    document.querySelector(".close-auth-btn")?.addEventListener("click", closeModal);

    overlay?.addEventListener("click", e => { if (e.target === overlay) closeModal(); });
    empOverlay?.addEventListener("click", e => { if (e.target === empOverlay) closeEmployeesModal(); });

    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const isSignup = signupFields.style.display === 'block';

        const userInput = authForm.querySelector('input[placeholder*="ex: admin"]');
        const passInput = authForm.querySelector('input[type="password"]');
        const nameInput = authForm.querySelector('input[placeholder="Popescu Ion"]');

        const payload = {
            username: userInput.value.trim(),
            password: passInput.value.trim()
        };

        if (isSignup) payload.full_name = nameInput.value.trim();

        const endpoint = isSignup ? '/api/register' : '/api/login';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                if (isSignup) {
                    alert("Cont creat! Te poți loga acum.");
                    authForm.reset();
                    openModal('login');
                } else {
                    localStorage.setItem("stockmaster_user", result.user || result.username || payload.username);
                    location.reload();
                }
            } else {
                alert(result.message || "Eroare login");
            }
        } catch (err) {
            alert("Serverul nu poate fi contactat.");
        }
    });

    document.addEventListener("click", function (e) {
        if (e.target.id === "logoutBtn") {
            localStorage.removeItem("stockmaster_user");
            location.reload();
        }
    });
};