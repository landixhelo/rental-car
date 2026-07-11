document.addEventListener("DOMContentLoaded", () => {
    checkLogin();
    loadReservations();
});

function checkLogin() {
    const loggedUser = getLoggedUser();
    if (!loggedUser) {
        showToast("Duhet të identifikoheni!");
        setTimeout(() => (window.location.href = "login.html"), 800);
    }
}

function loadReservations() {
    const container = document.getElementById("reservationsContainer");
    if (!container) return;

    const loggedUser = getLoggedUser();
    if (!loggedUser) return;

    const myReservations = getJSON("reservations", [])
        .filter(r => r.email === loggedUser.email)
        .slice()
        .reverse();

    if (!myReservations.length) {
        container.innerHTML = `
            <div class="empty-reservations">
                <i class="fa-regular fa-calendar-xmark"></i>
                <h3>Nuk keni ende rezervime.</h3>
                <p>Eksploro flotën dhe rezervo makinën tënde.</p>
                <a href="cars.html" class="btn">Shiko Makinat</a>
            </div>`;
        return;
    }

    container.innerHTML = myReservations.map(reservation => {
        const canCancel =
            reservation.status !== "Cancelled" &&
            reservation.status !== "Completed" &&
            reservation.status !== "Rejected";

        const extrasText = (reservation.extras || [])
            .map(e => e.name)
            .join(", ") || "Asnjë";

        return `
        <div class="reservation-card">
            <div class="reservation-media">
                <img src="${reservation.image || "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80"}"
                     alt="${reservation.brand} ${reservation.model}">
            </div>
            <div class="reservation-body">
                <div class="reservation-top">
                    <h3>${reservation.brand} ${reservation.model}</h3>
                    <span class="status status-${(reservation.status || "").toLowerCase()}">${reservation.status}</span>
                </div>
                <p><i class="fa-regular fa-calendar"></i> ${reservation.startDate} → ${reservation.endDate}</p>
                <p><i class="fa-solid fa-location-dot"></i> Marrja: ${reservation.pickupLocation}</p>
                <p><i class="fa-solid fa-flag-checkered"></i> Kthimi: ${reservation.returnLocation || reservation.pickupLocation}</p>
                <p><i class="fa-solid fa-plus"></i> Extras: ${extrasText}</p>
                <p><i class="fa-solid fa-credit-card"></i> ${reservation.paymentMethod || "-"} · ${reservation.paymentStatus || "-"}</p>
                <p><i class="fa-solid fa-file"></i> Dokument: ${reservation.document ? reservation.document.name : "Nuk u ngarkua"}</p>
                <p class="reservation-price"><i class="fa-solid fa-euro-sign"></i> €${reservation.totalPrice || "-"}</p>
                ${canCancel ? `<button class="cancel-btn" onclick="cancelReservation(${reservation.id})">Anulo Rezervimin</button>` : ""}
            </div>
        </div>`;
    }).join("");
}

function cancelReservation(id) {
    if (!confirm("A jeni i sigurt që doni ta anuloni rezervimin?")) return;

    const reservations = getJSON("reservations", []);
    const index = reservations.findIndex(r => r.id === id);
    if (index === -1) {
        showToast("Rezervimi nuk u gjet!");
        return;
    }

    reservations[index].status = "Cancelled";
    setJSON("reservations", reservations);
    showToast("Rezervimi u anulua!");
    loadReservations();
}
