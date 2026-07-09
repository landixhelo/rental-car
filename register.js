document.addEventListener("DOMContentLoaded", () => {

    const registerForm =
        document.querySelector(".register-form");

    if (!registerForm) return;

    registerForm.addEventListener("submit", (e) => {

        e.preventDefault();

        const fullName =
            document.getElementById("registerName").value;

        const email =
            document.getElementById("registerEmail").value;

        const password =
            document.getElementById("registerPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        if (
            fullName === "" ||
            email === "" ||
            password === "" ||
            confirmPassword === ""
        ) {
            showToast("Plotëso të gjitha fushat!");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Fjalëkalimet nuk përputhen!");
            return;
        }

        let users =
            JSON.parse(localStorage.getItem("users")) || [];

        const existingUser =
            users.find(user => user.email === email);

        if (existingUser) {
            showToast("Ky email ekziston!");
            return;
        }

        const newUser = {
            fullName,
            email,
            password
        };

        users.push(newUser);

        localStorage.setItem(
            "users",
            JSON.stringify(users)
        );

        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(newUser)
        );

        showToast(`Mirësevjen ${fullName}`);

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);

    });

});