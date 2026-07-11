document.addEventListener("DOMContentLoaded", () => {
    seedDemoCars();
    loadCarDetails();
    setupReviews();
});

function loadCarDetails() {
    const params = new URLSearchParams(window.location.search);
    const carId = Number(params.get("id"));
    const cars = getJSON("cars", []);
    const car = cars.find(c => c.id === carId);

    if (!car) {
        showToast("Makina nuk u gjet!");
        setTimeout(() => (window.location.href = "cars.html"), 1200);
        return;
    }

    setJSON("currentCar", car);

    document.getElementById("carImage").src = car.image;
    document.getElementById("carImage").alt = `${car.brand} ${car.model}`;
    document.getElementById("carType").innerText = car.type;
    document.getElementById("carTitle").innerText = `${car.brand} ${car.model}`;
    document.getElementById("carYear").innerText = car.year;
    document.getElementById("carPrice").innerText = `€${car.price}`;
    document.getElementById("carSeats").innerText = car.seats;
    document.getElementById("carFuel").innerText = car.fuel;
    document.getElementById("carTransmission").innerText = car.transmission;
    document.getElementById("carDoors").innerText = car.doors || "-";
    document.getElementById("carLuggage").innerText = car.luggage || "-";
    document.getElementById("carHorsepower").innerText = car.horsepower || "-";
    document.getElementById("carColor").innerText = car.color || "-";
    document.getElementById("carMileage").innerText = car.mileage || "-";
    document.getElementById("carLocation").innerText = car.location || "Tiranë";
    document.getElementById("carStatus").innerText = car.status || "Disponueshme";
    document.getElementById("carDescription").innerText =
        car.description ||
        "Makinë premium në gjendje perfekte, ideale për udhëtime dhe përdorim të përditshëm.";

    const rating = getCarRating(car.id);
    document.getElementById("carRatingLine").innerText =
        `⭐ ${rating.count ? rating.avg : "-"} (${rating.count} vlerësime)`;

    const featuresList = document.getElementById("carFeatures");
    const features =
        Array.isArray(car.features) && car.features.length
            ? car.features
            : ["Klimë", "Bluetooth", "ABS", "Airbag"];

    featuresList.innerHTML = features
        .map(f => `<li><i class="fa-solid fa-check"></i><span>${f}</span></li>`)
        .join("");

    const favBtn = document.getElementById("favoriteDetailBtn");
    if (favBtn) {
        const active = isFavorite(car.id);
        favBtn.classList.toggle("active", active);
        favBtn.innerHTML = `<i class="fa-${active ? "solid" : "regular"} fa-heart"></i>`;
        favBtn.onclick = () => {
            const nowActive = toggleFavorite(car.id);
            if (typeof nowActive !== "boolean") return;
            favBtn.classList.toggle("active", nowActive);
            favBtn.innerHTML = `<i class="fa-${nowActive ? "solid" : "regular"} fa-heart"></i>`;
        };
    }

    renderReviews(car.id);
}

function setupReviews() {
    const form = document.getElementById("reviewForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const car = getJSON("currentCar", null);
        if (!car) return;

        const ok = addReview({
            carId: car.id,
            rating: document.getElementById("reviewRating").value,
            comment: document.getElementById("reviewComment").value
        });

        if (!ok) return;
        form.reset();
        renderReviews(car.id);
        const rating = getCarRating(car.id);
        document.getElementById("carRatingLine").innerText =
            `⭐ ${rating.avg} (${rating.count} vlerësime)`;
    });
}

function renderReviews(carId) {
    const box = document.getElementById("reviewsList");
    if (!box) return;

    const reviews = getCarReviews(carId).slice().reverse();
    if (!reviews.length) {
        box.innerHTML = `<p class="hint-text">Ende pa vlerësime. Ji i pari!</p>`;
        return;
    }

    box.innerHTML = reviews.map(r => `
        <div class="review-item">
            <div class="review-top">
                <strong>${r.userName}</strong>
                <span>⭐ ${r.rating}/5</span>
            </div>
            <p>${r.comment || "Pa koment."}</p>
            <small>${new Date(r.createdAt).toLocaleDateString()}</small>
        </div>
    `).join("");
}
