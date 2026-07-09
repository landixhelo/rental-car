document.addEventListener("DOMContentLoaded", () => {

    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", (e) => {

        e.preventDefault();

        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("isAdmin");

        showToast("U ç'identifikuat me sukses!");

        setTimeout(() => {

            window.location.href = "index.html";

        }, 1000);

    });

});