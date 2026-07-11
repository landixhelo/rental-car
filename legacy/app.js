/* Shared helpers for AutoRent */

const LOCATIONS = [
    { id: "tirane", name: "Tiranë - Qendra", fee: 0 },
    { id: "airport", name: "Aeroporti Rinas", fee: 15 },
    { id: "durres", name: "Durrës", fee: 20 },
    { id: "vlore", name: "Vlorë", fee: 35 }
];

const EXTRAS = [
    { id: "gps", name: "GPS", price: 5 },
    { id: "childSeat", name: "Sedilje fëmijësh", price: 7 },
    { id: "driver", name: "Shofer", price: 40 },
    { id: "insurance", name: "Sigurim ekstra", price: 12 }
];

function getJSON(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
        return fallback;
    }
}

function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getLoggedUser() {
    return getJSON("loggedInUser", null);
}

function getFavorites() {
    return getJSON("favorites", []);
}

function toggleFavorite(carId) {
    const user = getLoggedUser();
    if (!user) {
        showToast("Duhet të identifikoheni për favoritet!");
        setTimeout(() => (window.location.href = "login.html"), 900);
        return false;
    }

    let favorites = getFavorites();
    const id = Number(carId);
    const exists = favorites.includes(id);

    favorites = exists
        ? favorites.filter(f => f !== id)
        : [...favorites, id];

    setJSON("favorites", favorites);
    showToast(exists ? "U hoq nga favoritet" : "U shtua te favoritet");
    return !exists;
}

function isFavorite(carId) {
    return getFavorites().includes(Number(carId));
}

function getReviews() {
    return getJSON("reviews", []);
}

function getCarReviews(carId) {
    return getReviews().filter(r => r.carId === Number(carId));
}

function getCarRating(carId) {
    const list = getCarReviews(carId);
    if (!list.length) return { avg: 0, count: 0 };
    const avg =
        list.reduce((sum, r) => sum + Number(r.rating), 0) / list.length;
    return { avg: Math.round(avg * 10) / 10, count: list.length };
}

function addReview({ carId, rating, comment }) {
    const user = getLoggedUser();
    if (!user) {
        showToast("Duhet të identifikoheni!");
        return false;
    }

    if (!rating || rating < 1 || rating > 5) {
        showToast("Zgjidh një vlerësim 1-5!");
        return false;
    }

    const reviews = getReviews();
    reviews.push({
        id: Date.now(),
        carId: Number(carId),
        rating: Number(rating),
        comment: (comment || "").trim(),
        userName: user.fullName,
        email: user.email,
        createdAt: new Date().toISOString()
    });

    setJSON("reviews", reviews);
    showToast("Vlerësimi u shtua!");

    if (window.AutoRentAPI && window.AutoRentAPI.createReview) {
        window.AutoRentAPI.createReview(reviews[reviews.length - 1]).catch(function () {});
    }

    return true;
}

function sendMockNotification(reservation) {
    const inbox = getJSON("notifications", []);
    inbox.unshift({
        id: Date.now(),
        type: "reservation",
        title: "Rezervimi u konfirmua",
        message: `Rezervimi për ${reservation.brand} ${reservation.model} (${reservation.startDate} → ${reservation.endDate}) u ruajt. Pagesa: ${reservation.paymentMethod}.`,
        email: reservation.email,
        read: false,
        createdAt: new Date().toISOString()
    });
    setJSON("notifications", inbox.slice(0, 50));
}

function getUserNotifications() {
    const user = getLoggedUser();
    if (!user) return [];
    return getJSON("notifications", []).filter(n => n.email === user.email);
}

function formatMoney(value) {
    return `€${Number(value || 0).toFixed(0)}`;
}

function locationOptionsHtml(selectedId = "tirane") {
    return LOCATIONS.map(loc =>
        `<option value="${loc.id}" ${loc.id === selectedId ? "selected" : ""}>
            ${loc.name} ${loc.fee ? `(+€${loc.fee})` : ""}
        </option>`
    ).join("");
}

function getLocationById(id) {
    return LOCATIONS.find(l => l.id === id) || LOCATIONS[0];
}
