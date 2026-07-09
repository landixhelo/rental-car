document.addEventListener("DOMContentLoaded", () => {

    setupFilters();

    loadCars();

});


// ===============================
// LOAD CARS
// ===============================

function loadCars() {

    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    renderCars(cars);

}


// ===============================
// FILTERS
// ===============================

function setupFilters() {

    document
        .getElementById("searchInput")
        ?.addEventListener("input", filterCars);

    document
        .getElementById("typeFilter")
        ?.addEventListener("change", filterCars);

    document
        .getElementById("statusFilter")
        ?.addEventListener("change", filterCars);

    document
        .getElementById("clearFiltersBtn")
        ?.addEventListener("click", clearFilters);

}

function filterCars() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .toLowerCase();

    const type =
        document
            .getElementById("typeFilter")
            .value;

    const status =
        document
            .getElementById("statusFilter")
            .value;

    let cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    cars = cars.filter(car => {

        const matchesSearch =

            car.brand.toLowerCase().includes(search) ||

            car.model.toLowerCase().includes(search);

        const matchesType =

            type === "all" ||

            car.type === type;

        const matchesStatus =

            status === "all" ||

            car.status === status;

        return (

            matchesSearch &&

            matchesType &&

            matchesStatus

        );

    });

    renderCars(cars);

}

function clearFilters() {

    document.getElementById("searchInput").value = "";

    document.getElementById("typeFilter").value = "all";

    document.getElementById("statusFilter").value = "all";

    loadCars();

}


// ===============================
// RENDER
// ===============================

function renderCars(cars) {

    const container =
        document.getElementById("fleetContainer");

    const resultsText =
        document.getElementById("resultsText");

    if (!container) return;

    container.innerHTML = "";

    resultsText.innerText =
        `${cars.length} makina të gjetura`;

    cars.forEach(car => {

        container.innerHTML += `

        <a
            href="cardetails.html?id=${car.id}"
            class="fleet-card-link">

            <div class="fleet-card">

                <div class="fleet-image">

                    <img
                        src="${car.image}"
                        alt="${car.brand}">

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

                            <h3>

                                ${car.brand}

                            </h3>

                            <p>

                                ${car.model} • ${car.year}

                            </p>

                        </div>

                        <div class="fleet-price">

                            €${car.price}

                            <span>/ditë</span>

                        </div>

                    </div>

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