document.addEventListener("DOMContentLoaded", () => {

    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    const isAdmin = localStorage.getItem("isAdmin");

    const userDropdown = document.getElementById("userDropdown");
    const clientName = document.getElementById("clientName");
    const loginNav = document.getElementById("loginNav");
    const registerBtn = document.getElementById("registerBtn");
    const adminLink = document.getElementById("adminLink");
    const navList = document.querySelector(".navbar-nav");

    if (navList && !document.getElementById("navContact")) {
        const carsLink = navList.querySelector('a[href="cars.html"]')?.parentElement;

        const extraLinks = `
            <li class="nav-item" id="navContact">
                <a class="nav-link" href="contact.html">Kontakt</a>
            </li>
            <li class="nav-item" id="navFaq">
                <a class="nav-link" href="faq.html">FAQ</a>
            </li>
        `;

        if (carsLink) {
            carsLink.insertAdjacentHTML("afterend", extraLinks);
        }
    }

    const dropdown = document.querySelector("#userDropdown .dropdown-menu");
    if (dropdown && !document.getElementById("favoritesLink")) {
        const myRes = document.getElementById("myReservationsLink")?.parentElement;
        const extraUserLinks = `
            <li>
                <a id="favoritesLink" class="dropdown-item" href="favorites.html">Favoritet</a>
            </li>
            <li>
                <a id="profileLink" class="dropdown-item" href="profile.html">Profili Im</a>
            </li>
        `;
        if (myRes) {
            myRes.insertAdjacentHTML("afterend", extraUserLinks);
        }
    }

    if (user) {
        if (userDropdown) userDropdown.style.display = "block";
        if (clientName) clientName.innerHTML = `👤 ${user.fullName}`;
        if (loginNav) loginNav.style.display = "none";
        if (registerBtn) registerBtn.style.display = "none";
    } else {
        if (userDropdown) userDropdown.style.display = "none";
        if (loginNav) loginNav.style.display = "block";
        if (registerBtn) registerBtn.style.display = "inline-block";
    }

    if (adminLink) {
        adminLink.style.display = isAdmin === "true" ? "block" : "none";
    }

    // Footer links
    document.querySelectorAll("footer").forEach(footer => {
        if (footer.querySelector(".footer-links")) return;
        footer.insertAdjacentHTML("beforeend", `
            <div class="footer-links">
                <a href="contact.html">Kontakt</a>
                <a href="faq.html">FAQ</a>
                <a href="terms.html">Kushtet</a>
                <a href="cars.html">Makinat</a>
            </div>
        `);
    });

});
