document.addEventListener("DOMContentLoaded", () => {
    seedDemoCars();
    setupFilters();
    loadCars();
});

function loadCars() {
    renderCars(getJSON("cars", []));
}

function setupFilters() {
    [
        "searchInput",
        "typeFilter",
        "statusFilter",
        "fuelFilter",
        "transmissionFilter",
        "locationFilter",
        "minPrice",
        "maxPrice"
    ].forEach(id => {
        document.getElementById(id)?.addEventListener("input", filterCars);
        document.getElementById(id)?.addEventListener("change", filterCars);
    });

    document.getElementById("clearFiltersBtn")
        ?.addEventListener("click", clearFilters);
}

function filterCars() {
    const search = (document.getElementById("searchInput")?.value || "").toLowerCase();
    const type = document.getElementById("typeFilter")?.value || "all";
    const status = document.getElementById("statusFilter")?.value || "all";
    const fuel = document.getElementById("fuelFilter")?.value || "all";
    const transmission = document.getElementById("transmissionFilter")?.value || "all";
    const location = document.getElementById("locationFilter")?.value || "all";
    const minPrice = Number(document.getElementById("minPrice")?.value || 0);
    const maxPrice = Number(document.getElementById("maxPrice")?.value || 0);

    let cars = getJSON("cars", []);

    cars = cars.filter(car => {
        const matchesSearch =
            car.brand.toLowerCase().includes(search) ||
            car.model.toLowerCase().includes(search) ||
            (car.location || "").toLowerCase().includes(search) ||
            (car.color || "").toLowerCase().includes(search);

        const matchesType = type === "all" || car.type === type;
        const matchesStatus = status === "all" || car.status === status;
        const matchesFuel = fuel === "all" || car.fuel === fuel;
        const matchesTransmission = transmission === "all" || car.transmission === transmission;
        const matchesLocation =
            location === "all" ||
            (car.location || "").toLowerCase().includes(location.toLowerCase());

        const price = Number(car.price);
        const matchesMin = !minPrice || price >= minPrice;
        const matchesMax = !maxPrice || price <= maxPrice;

        return (
            matchesSearch &&
            matchesType &&
            matchesStatus &&
            matchesFuel &&
            matchesTransmission &&
            matchesLocation &&
            matchesMin &&
            matchesMax
        );
    });

    renderCars(cars);
}

function clearFilters() {
    document.getElementById("searchInput").value = "";
    document.getElementById("typeFilter").value = "all";
    document.getElementById("statusFilter").value = "all";
    document.getElementById("fuelFilter").value = "all";
    document.getElementById("transmissionFilter").value = "all";
    document.getElementById("locationFilter").value = "all";
    document.getElementById("minPrice").value = "";
    document.getElementById("maxPrice").value = "";
    loadCars();
}

function renderCars(cars) {
    const container = document.getElementById("fleetContainer");
    const resultsText = document.getElementById("resultsText");
    if (!container) return;

    if (resultsText) {
        resultsText.innerText = `${cars.length} makina të gjetura`;
    }

    if (!cars.length) {
        container.innerHTML = `
            <div class="empty-fleet">
                <i class="fa-solid fa-car"></i>
                <h3>Nuk u gjet asnjë makinë</h3>
                <p>Provo filtra të tjerë ose pastro kërkimin.</p>
            </div>`;
        return;
    }

    container.innerHTML = cars.map(car => {
        const rating = getCarRating(car.id);
        const fav = isFavorite(car.id);
        return `
        <div class="fleet-card-wrap">
            <a href="cardetails.html?id=${car.id}" class="fleet-card-link">
                <div class="fleet-card">
                    <div class="fleet-image">
                        <img src="${car.image}" alt="${car.brand} ${car.model}">
                        <div class="card-tags">
                            <span class="type-tag">${car.type}</span>
                            <span class="status-tag">${car.status}</span>
                        </div>
                    </div>
                    <div class="fleet-content">
                        <div class="fleet-top">
                            <div>
                                <h3>${car.brand}</h3>
                                <p>${car.model} • ${car.year}</p>
                            </div>
                            <div class="fleet-price">€${car.price}<span>/ditë</span></div>
                        </div>
                        <p class="fleet-desc">${(car.description || "").slice(0, 90)}${(car.description || "").length > 90 ? "..." : ""}</p>
                        <p class="rating-line">⭐ ${rating.count ? rating.avg : "-"} (${rating.count})</p>
                        <div class="fleet-info">
                            <span><i class="fa-solid fa-user-group"></i> ${car.seats}</span>
                            <span><i class="fa-solid fa-gas-pump"></i> ${car.fuel}</span>
                            <span><i class="fa-solid fa-gears"></i> ${car.transmission}</span>
                            <span><i class="fa-solid fa-location-dot"></i> ${car.location || "Tiranë"}</span>
                        </div>
                    </div>
                </div>
            </a>
            <button class="fav-btn ${fav ? "active" : ""}" onclick="event.preventDefault(); onToggleFavorite(${car.id}, this)">
                <i class="fa-${fav ? "solid" : "regular"} fa-heart"></i>
            </button>
        </div>`;
    }).join("");
}

function onToggleFavorite(id, btn) {
    const active = toggleFavorite(id);
    if (typeof active !== "boolean") return;
    btn.classList.toggle("active", active);
    btn.innerHTML = `<i class="fa-${active ? "solid" : "regular"} fa-heart"></i>`;
}
