document.addEventListener("DOMContentLoaded", () => {

    checkAdmin();

    loadStatistics();

    loadCars();

    loadReservations();

    setupImagePreview();

setupCarForm();

});



// ===============================
// KONTROLLI I ADMINIT
// ===============================

function checkAdmin() {

    const isAdmin = localStorage.getItem("isAdmin");

    if (isAdmin !== "true") {

        showToast("Nuk keni akses!");

        setTimeout(() => {

            window.location.href = "index.html";

        }, 1000);

    }

}



// ===============================
// STATISTIKAT
// ===============================

function loadStatistics() {

    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    const users =
        JSON.parse(localStorage.getItem("users")) || [];

    const reservations =
        JSON.parse(localStorage.getItem("reservations")) || [];

    document.getElementById("carsCount").innerText =
        cars.length;

    document.getElementById("usersCount").innerText =
        users.length;

    document.getElementById("reservationsCount").innerText =
        reservations.length;

}



// ===============================
// LISTA E MAKINAVE
// ===============================

function loadCars() {

    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    const table =
        document.getElementById("carsTable");

    table.innerHTML = "";

    cars.forEach(car => {

        table.innerHTML += `

        <tr>

            <td>${car.brand} ${car.model}</td>

            <td>${car.year}</td>

            <td>€${car.price}</td>

            <td>

                <button
                    onclick="editCar(${car.id})">

                    Edit

                </button>

                <button
                    onclick="deleteCar(${car.id})">

                    Delete

                </button>

            </td>

        </tr>

        `;

    });

}



// ===============================
// REZERVIMET
// ===============================

function loadReservations() {

    const reservations =
        JSON.parse(localStorage.getItem("reservations")) || [];

    const table =
        document.getElementById("reservationsTable");

    table.innerHTML = "";

    reservations.forEach(reservation => {

        table.innerHTML += `

        <tr>

            <td>${reservation.customer}</td>

            <td>${reservation.car}</td>

            <td>${reservation.startDate}</td>

            <td>${reservation.endDate}</td>

        </tr>

        `;

    });

}

function setupImagePreview() {

    const imageUpload =
        document.getElementById("imageUpload");

    const preview =
        document.getElementById("preview");

    imageUpload.addEventListener("change", () => {

        const file = imageUpload.files[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = function (e) {

            preview.src = e.target.result;

            preview.style.display = "block";

        };

        reader.readAsDataURL(file);

    });

}

function setupCarForm() {

    const form =
        document.getElementById("carForm");

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        saveCar();

    });

}

function saveCar() {

    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    const carId =
        document.getElementById("carId").value;

    const car = {

        id: carId ? Number(carId) : Date.now(),

        brand: document.getElementById("brand").value,

        model: document.getElementById("model").value,

        year: document.getElementById("year").value,

        price: document.getElementById("price").value,

        seats: document.getElementById("seats").value,

        fuel: document.getElementById("fuel").value,

        transmission: document.getElementById("transmission").value,

        type: document.getElementById("type").value,

        status: document.getElementById("status").value,

        image: document.getElementById("preview").src

    };

    if (carId) {

        const index =
            cars.findIndex(c => c.id == carId);

        cars[index] = car;

        showToast("Makina u përditësua!");

    } else {

        cars.push(car);

        showToast("Makina u shtua!");

    }

    localStorage.setItem("cars", JSON.stringify(cars));

    document.getElementById("carForm").reset();

    document.getElementById("carId").value = "";

    document.getElementById("preview").style.display = "none";

    loadCars();

    loadStatistics();

}

function editCar(id) {

    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    const car =
        cars.find(c => c.id == id);

    if (!car) return;

    document.getElementById("carId").value = car.id;

    document.getElementById("brand").value = car.brand;

    document.getElementById("model").value = car.model;

    document.getElementById("year").value = car.year;

    document.getElementById("price").value = car.price;

    document.getElementById("seats").value = car.seats;

    document.getElementById("fuel").value = car.fuel;

    document.getElementById("transmission").value = car.transmission;

    document.getElementById("type").value = car.type;

    document.getElementById("status").value = car.status;

    document.getElementById("preview").src = car.image;

    document.getElementById("preview").style.display = "block";

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// Do t'i krijojmë në hapin tjetër



function deleteCar(id) {

    if (!confirm("A jeni i sigurt?")) return;

    let cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    cars =
        cars.filter(car => car.id != id);

    localStorage.setItem(
        "cars",
        JSON.stringify(cars)
    );

    showToast("Makina u fshi!");

    loadCars();

    loadStatistics();

}