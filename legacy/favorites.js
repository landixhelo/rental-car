document.addEventListener("DOMContentLoaded", () => {
    seedDemoCars();

    const user = getLoggedUser();
    if (!user) {
        showToast("Duhet të identifikoheni!");
        setTimeout(() => (window.location.href = "login.html"), 800);
        return;
    }

    renderFavorites();
});

function renderFavorites() {
    const container = document.getElementById("favoritesContainer");
    const favoriteIds = getFavorites();
    const cars = getJSON("cars", []).filter(c => favoriteIds.includes(c.id));

    if (!cars.length) {
        container.innerHTML = `
            <div class="empty-fleet">
                <i class="fa-regular fa-heart"></i>
                <h3>Nuk ke favoritet ende</h3>
                <p>Shto makina nga katalogu me ikonën e zemrës.</p>
                <a href="cars.html" class="btn">Shiko Makinat</a>
            </div>
        `;
        return;
    }

    container.innerHTML = cars.map(car => {
        const rating = getCarRating(car.id);
        return `
        <div class="fleet-card-link">
            <div class="fleet-card">
                <div class="fleet-image">
                    <img src="${car.image}" alt="${car.brand} ${car.model}">
                    <button class="fav-btn active" onclick="removeFav(${car.id})">
                        <i class="fa-solid fa-heart"></i>
                    </button>
                </div>
                <div class="fleet-content">
                    <div class="fleet-top">
                        <div>
                            <h3>${car.brand}</h3>
                            <p>${car.model} • ${car.year}</p>
                        </div>
                        <div class="fleet-price">€${car.price}<span>/ditë</span></div>
                    </div>
                    <p class="fleet-desc">${(car.description || "").slice(0, 80)}...</p>
                    <p class="rating-line">⭐ ${rating.avg || "-"} (${rating.count})</p>
                    <a href="cardetails.html?id=${car.id}" class="btn-primary-block">Shiko Detajet</a>
                </div>
            </div>
        </div>`;
    }).join("");
}

function removeFav(id) {
    toggleFavorite(id);
    renderFavorites();
}
