document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("#logoutBtn, .logout-btn").forEach(btn => {

        btn.addEventListener("click", (e) => {

            e.preventDefault();

            localStorage.removeItem("loggedInUser");
            localStorage.removeItem("isAdmin");

            showToast("U ç'identifikuat me sukses!");

            setTimeout(() => {

                window.location.href = "index.html";

            }, 1000);

        });

    });

});
