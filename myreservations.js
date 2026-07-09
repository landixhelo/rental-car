document.addEventListener("DOMContentLoaded", () => {

    checkLogin();

    loadReservations();

});

function checkLogin() {

    const loggedUser =
        JSON.parse(localStorage.getItem("loggedInUser"));

    if (!loggedUser) {

        showToast("Duhet të identifikoheni!");

        setTimeout(() => {

            window.location.href = "login.html";

        }, 1000);

    }

}

function loadReservations() {

    const container =
        document.getElementById("reservationsContainer");

    if (!container) return;

    const loggedUser =
        JSON.parse(localStorage.getItem("loggedInUser"));

    const reservations =
        JSON.parse(localStorage.getItem("reservations")) || [];

    const myReservations =
        reservations.filter(reservation =>
            reservation.email === loggedUser.email
        );

    console.log("Logged User:", loggedUser);
    console.log("Reservations:", reservations);
    console.log("My Reservations:", myReservations);

    if (myReservations.length === 0) {

        container.innerHTML = `

            <div class="empty-reservations">

                <h3>Nuk keni ende rezervime.</h3>

            </div>

        `;

        return;

    }

    container.innerHTML = "";

    myReservations.forEach(reservation => {

    container.innerHTML += `

        <div class="reservation-card">

            <h3>

                🚗 ${reservation.brand} ${reservation.model}

            </h3>

            <p>

                📅 ${reservation.startDate} → ${reservation.endDate}

            </p>

            <p>

                📍 ${reservation.pickupLocation}

            </p>

            <p>

                💶 €${reservation.totalPrice || "-"}

            </p>

            <span class="status">

                ${reservation.status}

            </span>

            <button
                class="cancel-btn"
                onclick="cancelReservation(${reservation.id})">

                Anulo Rezervimin

            </button>

        </div>

    `;

});

}