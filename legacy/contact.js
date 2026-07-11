document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const message = {
            id: Date.now(),
            name: document.getElementById("contactName").value.trim(),
            email: document.getElementById("contactEmail").value.trim(),
            phone: document.getElementById("contactPhone").value.trim(),
            subject: document.getElementById("contactSubject").value,
            message: document.getElementById("contactMessage").value.trim(),
            createdAt: new Date().toISOString(),
            status: "New"
        };

        const messages = getJSON("contactMessages", []);
        messages.unshift(message);
        setJSON("contactMessages", messages);

        if (window.AutoRentAPI && window.AutoRentAPI.createContact) {
            window.AutoRentAPI.createContact(message).catch(function () {});
        }

        showToast("Mesazhi u dërgua! Do t'ju kontaktojmë së shpejti.");
        form.reset();
    });
});
