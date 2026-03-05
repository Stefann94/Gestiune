window.initCommonComponents = function() {
    const navbarHTML = `
    <nav class="navbar">
        <div class="logo">
            <i class="fas fa-boxes"></i> <span>StockMaster</span>
        </div>
        <ul class="nav-links">
            <li><a href="index.html"><i class="fas fa-chart-line"></i> <span>Dashboard</span></a></li>
            <li><a href="produse.html"><i class="fas fa-box"></i> <span>Produse</span></a></li>
            <li><a href="#"><i class="fas fa-arrow-down"></i> <span>Intrări</span></a></li>
            <li><a href="#"><i class="fas fa-arrow-up"></i> <span>Ieșiri</span></a></li>
            <li><a href="#"><i class="fas fa-truck"></i> <span>Furnizori</span></a></li>
            <li><a href="#"><i class="fas fa-file-invoice"></i> <span>Rapoarte</span></a></li>
        </ul>
        <div class="user-menu">
            <span class="user-role">Admin</span>
            <a href="#" class="logout-btn" title="Deconectare">
                <i class="fas fa-sign-out-alt"></i>
            </a>
        </div>
    </nav>`;

    const target = document.getElementById('navbar-placeholder');
    if (target) {
        target.innerHTML = navbarHTML;
    }
};