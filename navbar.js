document.addEventListener("DOMContentLoaded", () => {

    const user = JSON.parse(localStorage.getItem("loggedInUser"));
    const isAdmin = localStorage.getItem("isAdmin");

    const userDropdown = document.getElementById("userDropdown");
    const clientName = document.getElementById("clientName");

    const loginNav = document.getElementById("loginNav");
    const registerBtn = document.getElementById("registerBtn");
    const adminLink = document.getElementById("adminLink");

    if (user) {

        if (userDropdown) {
            userDropdown.style.display = "block";
        }

        if (clientName) {
            clientName.innerHTML = `👤 ${user.fullName}`;
        }

        if (loginNav) {
            loginNav.style.display = "none";
        }

        if (registerBtn) {
            registerBtn.style.display = "none";
        }

    } else {

        if (userDropdown) {
            userDropdown.style.display = "none";
        }

        if (loginNav) {
            loginNav.style.display = "block";
        }

        if (registerBtn) {
            registerBtn.style.display = "inline-block";
        }

    }

    if (isAdmin === "true") {

        if (adminLink) {
            adminLink.style.display = "block";
        }

    } else {

        if (adminLink) {
            adminLink.style.display = "none";
        }

    }

});


document.addEventListener("DOMContentLoaded", () => {

    console.log("Navbar Loaded");

    const user = JSON.parse(
        localStorage.getItem("loggedInUser")
    );

    console.log(user);

});