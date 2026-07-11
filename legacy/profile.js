document.addEventListener("DOMContentLoaded", () => {
    const user = getLoggedUser();
    if (!user) {
        showToast("Duhet të identifikoheni!");
        setTimeout(() => (window.location.href = "login.html"), 800);
        return;
    }

    document.getElementById("profileName").value = user.fullName || "";
    document.getElementById("profileEmail").value = user.email || "";
    document.getElementById("profilePhone").value = user.phone || "";

    renderNotifications();

    document.getElementById("profileForm").addEventListener("submit", (e) => {
        e.preventDefault();

        const fullName = document.getElementById("profileName").value.trim();
        const email = document.getElementById("profileEmail").value.trim();
        const phone = document.getElementById("profilePhone").value.trim();
        const password = document.getElementById("profilePassword").value.trim();

        if (!fullName || !email) {
            showToast("Emri dhe email janë të detyrueshme!");
            return;
        }

        let users = getJSON("users", []);
        const index = users.findIndex(u => u.email === user.email);

        if (index === -1) {
            showToast("Përdoruesi nuk u gjet!");
            return;
        }

        if (email !== user.email && users.some(u => u.email === email)) {
            showToast("Ky email ekziston!");
            return;
        }

        users[index] = {
            ...users[index],
            fullName,
            email,
            phone,
            password: password || users[index].password
        };

        setJSON("users", users);
        setJSON("loggedInUser", users[index]);

        showToast("Profili u përditësua!");
        document.getElementById("profilePassword").value = "";
    });
});

function renderNotifications() {
    const box = document.getElementById("notificationsList");
    const list = getUserNotifications();

    if (!list.length) {
        box.innerHTML = `<p class="hint-text">Nuk ke njoftime ende.</p>`;
        return;
    }

    box.innerHTML = list.map(n => `
        <div class="notification-item">
            <strong>${n.title}</strong>
            <p>${n.message}</p>
            <small>${new Date(n.createdAt).toLocaleString()}</small>
        </div>
    `).join("");
}
