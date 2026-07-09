document.addEventListener("DOMContentLoaded", () => {

    setupReservation();

    setupCalculation();

});


// ===================================
// SETUP
// ===================================

function setupReservation() {

    const reserveBtn =
        document.getElementById("reserveBtn");

    if (!reserveBtn) return;

    reserveBtn.addEventListener(
        "click",
        saveReservation
    );

}

function setupCalculation() {

    const startInput =
        document.getElementById("startDate");

    const endInput =
        document.getElementById("endDate");

    if (startInput) {

        startInput.addEventListener(
            "change",
            calculateReservation
        );

    }

    if (endInput) {

        endInput.addEventListener(
            "change",
            calculateReservation
        );

    }

}



// ===================================
// LLOGARITJA
// ===================================

function calculateReservation() {

    const currentCar =
        JSON.parse(localStorage.getItem("currentCar"));

    if (!currentCar) return;

    const start =
        document.getElementById("startDate").value;

    const end =
        document.getElementById("endDate").value;

    if (!start || !end) {

        document.getElementById("totalDays").innerText = 0;

        document.getElementById("totalPrice").innerText = "€0";

        return;

    }

    const startDate =
        new Date(start);

    const endDate =
        new Date(end);

    const difference =
        endDate - startDate;

    const totalDays =
        Math.ceil(
            difference / (1000 * 60 * 60 * 24)
        );

    if (totalDays <= 0) {

        document.getElementById("totalDays").innerText = 0;

        document.getElementById("totalPrice").innerText = "€0";

        return;

    }

    document.getElementById("totalDays").innerText =
        totalDays;

    document.getElementById("totalPrice").innerText =
        "€" + (totalDays * Number(currentCar.price));

}



// ===================================
// KONTROLLI I DISPONUESHMËRISË
// ===================================

function isCarAvailable(carId, startDate, endDate) {

    const reservations =
        JSON.parse(localStorage.getItem("reservations")) || [];

    return !reservations.some(reservation => {

        if (reservation.carId !== carId) {

            return false;

        }

        const reservedStart =
            new Date(reservation.startDate);

        const reservedEnd =
            new Date(reservation.endDate);

        const selectedStart =
            new Date(startDate);

        const selectedEnd =
            new Date(endDate);

        return (
            selectedStart <= reservedEnd &&
            selectedEnd >= reservedStart
        );

    });

}



// ===================================
// RUAJ REZERVIMIN
// ===================================

function saveReservation() {

    const loggedUser =
        JSON.parse(localStorage.getItem("loggedInUser"));

    if (!loggedUser) {

        showToast("Duhet të identifikoheni!");

        setTimeout(() => {

            window.location.href = "login.html";

        }, 1000);

        return;

    }

    const currentCar =
        JSON.parse(localStorage.getItem("currentCar"));

    if (!currentCar) {

        showToast("Makina nuk u gjet!");

        return;

    }

    const startDate =
        document.getElementById("startDate").value;

    const endDate =
        document.getElementById("endDate").value;

    const pickupLocation =
        document.getElementById("pickupLocation").value.trim();

    const notes =
        document.getElementById("reservationNotes").value.trim();

    if (

        !startDate ||

        !endDate ||

        !pickupLocation

    ) {

        showToast("Plotëso të gjitha fushat!");

        return;

    }

    const totalDays =
        Math.ceil(

            (new Date(endDate) - new Date(startDate))

            / (1000 * 60 * 60 * 24)

        );

    if (totalDays <= 0) {

        showToast("Datat nuk janë të vlefshme!");

        return;

    }

    if (

        !isCarAvailable(

            currentCar.id,

            startDate,

            endDate

        )

    ) {

        showToast("Makina është e rezervuar në këto data!");

        return;

    }

    const reservation = {

        id: Date.now(),

        carId: currentCar.id,

        brand: currentCar.brand,

        model: currentCar.model,

        year: currentCar.year,

        image: currentCar.image,

        customer: loggedUser.fullName,

        email: loggedUser.email,

        pricePerDay: Number(currentCar.price),

        totalDays,

        totalPrice:
            totalDays * Number(currentCar.price),

        startDate,

        endDate,

        pickupLocation,

        notes,

        status: "Confirmed",

        createdAt:
            new Date().toISOString()

    };

    const reservations =
        JSON.parse(localStorage.getItem("reservations")) || [];

    reservations.push(reservation);

    localStorage.setItem(

        "reservations",

        JSON.stringify(reservations)

    );

    showToast("Rezervimi u krye me sukses!");

    document.getElementById("startDate").value = "";

    document.getElementById("endDate").value = "";

    document.getElementById("pickupLocation").value = "";

    document.getElementById("reservationNotes").value = "";

    document.getElementById("totalDays").innerText = "0";

    document.getElementById("totalPrice").innerText = "€0";

}