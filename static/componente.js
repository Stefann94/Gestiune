window.initCommonComponents = function () {
    const navbarHTML = `
    <nav class="navbar">
        <a href="/" class="logo-link">
                    <div class="logo">
                        <i class="fas fa-boxes"></i> <span>StockMaster</span>
                    </div>
        </a>
        <ul class="nav-links">
            <li>
                <a href="/dashboard"> 
                    <i class="fas fa-chart-line"></i> 
                    <span>Dashboard</span>
                </a>
            </li>
            <li><a href="/produse"><i class="fas fa-box"></i> <span>Produse</span></a></li>
            <li><a href="/intrari"><i class="fas fa-arrow-down"></i> <span>Intrări</span></a></li>
            <li><a href="/iesiri"><i class="fas fa-arrow-up"></i> <span>Ieșiri</span></a></li>
            <li><a href="/furnizori"><i class="fas fa-truck"></i> <span>Furnizori</span></a></li>
            <li><a href="/rapoarte"><i class="fas fa-file-invoice"></i> <span>Rapoarte</span></a></li>
        </ul>
        <div class="user-menu">
            <span class="user-role">Admin</span>
            <a href="/logout" class="logout-btn" title="Deconectare">
                <i class="fas fa-sign-out-alt"></i>
            </a>
        </div>
    </nav>`.trim(); // .trim() elimină spațiile de la începutul și sfârșitul stringului

    // În componente.js, la finalul funcției:
    const target = document.getElementById('navbar-placeholder');
    if (target) {
        target.innerHTML = navbarHTML;
        target.style.lineHeight = "0"; // Elimină orice spațiu creat de text/font
        target.style.fontSize = "0";   // Elimină spațiile albe dintre tag-uri
    }
};