document.addEventListener("DOMContentLoaded", () => {

    checkAdmin();

    seedDemoCars();

    loadStatistics();

    loadCars();

    loadReservations();

    loadUsers();

    loadReports();

    loadContactMessages();

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

    const activeReservations =
        reservations.filter(r =>
            r.status !== "Cancelled" &&
            r.status !== "Rejected"
        );

    document.getElementById("carsCount").innerText =
        cars.length;

    document.getElementById("usersCount").innerText =
        users.length;

    document.getElementById("reservationsCount").innerText =
        activeReservations.length;

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

            <td>${car.status || "-"}</td>

            <td>

                <button
                    class="admin-btn edit"
                    onclick="editCar(${car.id})">

                    Edit

                </button>

                <button
                    class="admin-btn delete"
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

    if (reservations.length === 0) {

        table.innerHTML = `

            <tr>
                <td colspan="7">Nuk ka rezervime ende.</td>
            </tr>

        `;

        return;

    }

    reservations
        .slice()
        .reverse()
        .forEach(reservation => {

            const carName =
                reservation.car ||
                `${reservation.brand || ""} ${reservation.model || ""}`.trim() ||
                "-";

            table.innerHTML += `

            <tr>

                <td>${reservation.customer || "-"}</td>

                <td>${carName}</td>

                <td>${reservation.startDate}</td>

                <td>${reservation.endDate}</td>

                <td>€${reservation.totalPrice || "-"}</td>

                <td>
                    <select
                        onchange="updateReservationStatus(${reservation.id}, this.value)">
                        <option value="Pending" ${reservation.status === "Pending" ? "selected" : ""}>Pending</option>
                        <option value="Confirmed" ${reservation.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
                        <option value="Completed" ${reservation.status === "Completed" ? "selected" : ""}>Completed</option>
                        <option value="Cancelled" ${reservation.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                        <option value="Rejected" ${reservation.status === "Rejected" ? "selected" : ""}>Rejected</option>
                    </select>
                </td>

                <td>

                    <button
                        class="admin-btn delete"
                        onclick="deleteReservation(${reservation.id})">

                        Fshi

                    </button>

                </td>

            </tr>

            `;

        });

}

function updateReservationStatus(id, status) {

    const reservations =
        JSON.parse(localStorage.getItem("reservations")) || [];

    const index =
        reservations.findIndex(r => r.id === id);

    if (index === -1) return;

    reservations[index].status = status;

    localStorage.setItem(
        "reservations",
        JSON.stringify(reservations)
    );

    showToast("Statusi u përditësua!");

    loadStatistics();

}

function deleteReservation(id) {

    if (!confirm("A jeni i sigurt që doni ta fshini rezervimin?")) {
        return;
    }

    let reservations =
        JSON.parse(localStorage.getItem("reservations")) || [];

    reservations =
        reservations.filter(r => r.id !== id);

    localStorage.setItem(
        "reservations",
        JSON.stringify(reservations)
    );

    showToast("Rezervimi u fshi!");

    loadReservations();

    loadStatistics();

}



// ===============================
// PERDORUESIT
// ===============================

function loadUsers() {

    const table =
        document.getElementById("usersTable");

    if (!table) return;

    const users =
        JSON.parse(localStorage.getItem("users")) || [];

    table.innerHTML = "";

    if (users.length === 0) {

        table.innerHTML = `

            <tr>
                <td colspan="3">Nuk ka përdorues të regjistruar.</td>
            </tr>

        `;

        return;

    }

    users.forEach(user => {

        table.innerHTML += `

        <tr>
            <td>${user.fullName || "-"}</td>
            <td>${user.email || "-"}</td>
            <td>
                <button
                    class="admin-btn delete"
                    onclick="deleteUser('${user.email}')">
                    Fshi
                </button>
            </td>
        </tr>

        `;

    });

}

function deleteUser(email) {

    if (!confirm("A jeni i sigurt që doni ta fshini këtë përdorues?")) {
        return;
    }

    let users =
        JSON.parse(localStorage.getItem("users")) || [];

    users =
        users.filter(u => u.email !== email);

    localStorage.setItem(
        "users",
        JSON.stringify(users)
    );

    showToast("Përdoruesi u fshi!");

    loadUsers();

    loadStatistics();

}

function loadReports() {
    const reservations = getJSON("reservations", []);
    const active = reservations.filter(r =>
        r.status !== "Cancelled" && r.status !== "Rejected"
    );

    const revenue = active.reduce((sum, r) => sum + Number(r.totalPrice || 0), 0);
    document.getElementById("revenueTotal").innerText = `€${revenue}`;

    const countByCar = {};
    active.forEach(r => {
        const key = `${r.brand} ${r.model}`;
        countByCar[key] = (countByCar[key] || 0) + 1;
    });

    const top = Object.entries(countByCar).sort((a, b) => b[1] - a[1])[0];
    document.getElementById("topCarName").innerText = top
        ? `${top[0]} (${top[1]})`
        : "-";

    const pending = reservations.filter(r =>
        r.paymentStatus &&
        r.paymentStatus !== "Paid (simulated)" &&
        r.status !== "Cancelled"
    ).length;
    document.getElementById("pendingPayments").innerText = pending;

    const calendar = document.getElementById("availabilityCalendar");
    if (!calendar) return;

    const upcoming = active
        .slice()
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
        .slice(0, 8);

    if (!upcoming.length) {
        calendar.innerHTML = `<p>Nuk ka rezervime aktive për kalendar.</p>`;
        return;
    }

    calendar.innerHTML = `
        <h3 style="margin-bottom:12px;">Kalendari i disponueshmërisë</h3>
        ${upcoming.map(r => `
            <div class="calendar-row">
                <strong>${r.brand} ${r.model}</strong>
                <span>${r.startDate} → ${r.endDate}</span>
                <span>${r.customer}</span>
            </div>
        `).join("")}
    `;
}

function loadContactMessages() {
    const table = document.getElementById("messagesTable");
    if (!table) return;

    const messages = getJSON("contactMessages", []);
    if (!messages.length) {
        table.innerHTML = `<tr><td colspan="4">Nuk ka mesazhe.</td></tr>`;
        return;
    }

    table.innerHTML = messages.slice(0, 20).map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.subject}</td>
            <td>${m.email}</td>
            <td>${(m.message || "").slice(0, 80)}${(m.message || "").length > 80 ? "..." : ""}</td>
        </tr>
    `).join("");
}

function setupImagePreview() {

    const imageUpload =
        document.getElementById("imageUpload");

    const preview =
        document.getElementById("preview");

    if (!imageUpload || !preview) return;

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

    if (!form) return;

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

    const preview =
        document.getElementById("preview");

    const brand =
        document.getElementById("brand").value.trim();

    const model =
        document.getElementById("model").value.trim();

    const year =
        document.getElementById("year").value;

    const price =
        document.getElementById("price").value;

    if (!brand || !model || !year || !price) {

        showToast("Plotëso fushat kryesore!");

        return;

    }

    const featuresRaw =
        document.getElementById("features").value.trim();

    const car = {

        id: carId ? Number(carId) : Date.now(),

        brand,

        model,

        year,

        price,

        seats: document.getElementById("seats").value,

        fuel: document.getElementById("fuel").value,

        transmission: document.getElementById("transmission").value,

        type: document.getElementById("type").value,

        status: document.getElementById("status").value,

        doors: document.getElementById("doors").value || "4",

        luggage: document.getElementById("luggage").value || "2",

        horsepower: document.getElementById("horsepower").value || "-",

        color: document.getElementById("color").value.trim() || "-",

        mileage: document.getElementById("mileage").value.trim() || "-",

        location: document.getElementById("location").value.trim() || "Tiranë",

        description:
            document.getElementById("description").value.trim(),

        features: featuresRaw
            ? featuresRaw.split(",").map(f => f.trim()).filter(Boolean)
            : [],

        image:
            preview.src && preview.style.display !== "none"
                ? preview.src
                : "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80"

    };

    if (carId) {

        const index =
            cars.findIndex(c => c.id == carId);

        if (index !== -1) {

            if (
                (!preview.src || preview.style.display === "none") &&
                cars[index].image
            ) {
                car.image = cars[index].image;
            }

            cars[index] = car;

            showToast("Makina u përditësua!");

        }

    } else {

        cars.push(car);

        showToast("Makina u shtua!");

    }

    localStorage.setItem("cars", JSON.stringify(cars));

    document.getElementById("carForm").reset();

    document.getElementById("carId").value = "";

    preview.style.display = "none";

    preview.removeAttribute("src");

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

    document.getElementById("doors").value = car.doors || "";

    document.getElementById("luggage").value = car.luggage || "";

    document.getElementById("horsepower").value = car.horsepower || "";

    document.getElementById("color").value = car.color || "";

    document.getElementById("mileage").value = car.mileage || "";

    document.getElementById("location").value = car.location || "";

    document.getElementById("description").value =
        car.description || "";

    document.getElementById("features").value =
        Array.isArray(car.features)
            ? car.features.join(", ")
            : "";

    document.getElementById("preview").src = car.image;

    document.getElementById("preview").style.display = "block";

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}

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
