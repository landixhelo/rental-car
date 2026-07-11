document.addEventListener("DOMContentLoaded", () => {

    seedDemoCars();

    loadFeaturedCars();

});

function loadFeaturedCars() {

    const container =
        document.getElementById("featuredCars");

    if (!container) return;

    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    container.innerHTML = "";

    const featuredCars = cars.slice(0, 6);

    featuredCars.forEach(car => {

        container.innerHTML += `

        <a href="cardetails.html?id=${car.id}" class="fleet-card-link">

            <div class="fleet-card">

                <div class="fleet-image">

                    <img
                        src="${car.image}"
                        alt="${car.brand} ${car.model}">

                    <div class="card-tags">

                        <span class="type-tag">
                            ${car.type}
                        </span>

                        <span class="status-tag">
                            ${car.status}
                        </span>

                    </div>

                </div>

                <div class="fleet-content">

                    <div class="fleet-top">

                        <div>

                            <h3>${car.brand}</h3>

                            <p>${car.model} • ${car.year}</p>

                        </div>

                        <div class="fleet-price">

                            €${car.price}

                            <span>/ditë</span>

                        </div>

                    </div>

                    <p class="fleet-desc">
                        ${(car.description || "").slice(0, 80)}${(car.description || "").length > 80 ? "..." : ""}
                    </p>

                    <div class="fleet-info">

                        <span>
                            <i class="fa-solid fa-user-group"></i>
                            ${car.seats}
                        </span>

                        <span>
                            <i class="fa-solid fa-gas-pump"></i>
                            ${car.fuel}
                        </span>

                        <span>
                            <i class="fa-solid fa-gears"></i>
                            ${car.transmission}
                        </span>

                    </div>

                </div>

            </div>

        </a>

        `;

    });

}
