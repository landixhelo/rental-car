document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.querySelector(".login-form");

    if (!loginForm) return;

    loginForm.addEventListener("submit", (e) => {

        e.preventDefault();

        const email = document
            .getElementById("loginEmail")
            .value
            .trim();

        const password = document
            .getElementById("loginPassword")
            .value
            .trim();

        const users =
            JSON.parse(localStorage.getItem("users")) || [];

        const validUser = users.find(user =>
            user.email === email &&
            user.password === password
        );

        if (!validUser) {

            showToast("Email ose fjalëkalimi gabim!");

            return;

        }

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(validUser)
        );

        if (
            validUser.email === "landitir22@gmail.com" &&
            validUser.password === "12345678"
        ) {

            localStorage.setItem(
                "isAdmin",
                "true"
            );

        } else {

            localStorage.setItem(
                "isAdmin",
                "false"
            );

        }

        showToast(`Mirësevini ${validUser.fullName}!`);

        setTimeout(() => {

            window.location.href = "index.html";

        }, 1000);

    });

});