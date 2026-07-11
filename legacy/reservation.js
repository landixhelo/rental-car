let uploadedDocument = null;

document.addEventListener("DOMContentLoaded", () => {
    setupBookingUI();
    setupReservation();
    setupCalculation();
    setupDateLimits();
    calculateReservation();
});

function setupBookingUI() {
    const pickup = document.getElementById("pickupLocation");
    const ret = document.getElementById("returnLocation");
    const extrasList = document.getElementById("extrasList");

    if (pickup) pickup.innerHTML = locationOptionsHtml("tirane");
    if (ret) ret.innerHTML = locationOptionsHtml("tirane");

    if (extrasList) {
        extrasList.innerHTML = EXTRAS.map(extra => `
            <label class="extra-item">
                <input type="checkbox" value="${extra.id}" data-price="${extra.price}">
                <span>${extra.name}</span>
                <strong>+€${extra.price}/ditë</strong>
            </label>
        `).join("");
    }

    const docInput = document.getElementById("documentUpload");
    if (docInput) {
        docInput.addEventListener("change", () => {
            const file = docInput.files[0];
            if (!file) {
                uploadedDocument = null;
                document.getElementById("documentStatus").innerText = "Opsionale, por rekomandohet";
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                showToast("Dokumenti duhet të jetë nën 2MB!");
                docInput.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedDocument = {
                    name: file.name,
                    type: file.type,
                    data: e.target.result
                };
                document.getElementById("documentStatus").innerText =
                    `Ngarkuar: ${file.name}`;
            };
            reader.readAsDataURL(file);
        });
    }
}

function setupReservation() {
    document.getElementById("reserveBtn")
        ?.addEventListener("click", saveReservation);
}

function setupCalculation() {
    ["startDate", "endDate", "pickupLocation", "returnLocation", "paymentMethod"]
        .forEach(id => {
            document.getElementById(id)
                ?.addEventListener("change", calculateReservation);
        });

    document.getElementById("extrasList")
        ?.addEventListener("change", calculateReservation);
}

function setupDateLimits() {
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    if (!startInput || !endInput) return;

    const today = new Date().toISOString().split("T")[0];
    startInput.min = today;
    endInput.min = today;

    startInput.addEventListener("change", () => {
        endInput.min = startInput.value || today;
        if (endInput.value && endInput.value < endInput.min) {
            endInput.value = "";
        }
        calculateReservation();
    });
}

function getSelectedExtras() {
    return [...document.querySelectorAll("#extrasList input:checked")].map(input => {
        const extra = EXTRAS.find(e => e.id === input.value);
        return {
            id: extra.id,
            name: extra.name,
            price: extra.price
        };
    });
}

function calculateReservation() {
    const currentCar = getJSON("currentCar", null);
    if (!currentCar) return;

    const start = document.getElementById("startDate")?.value;
    const end = document.getElementById("endDate")?.value;

    if (!start || !end) {
        setSummary(0, 0, 0, 0, 0);
        return;
    }

    const totalDays = Math.ceil(
        (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)
    );

    if (totalDays <= 0) {
        setSummary(0, 0, 0, 0, 0);
        return;
    }

    const carSubtotal = totalDays * Number(currentCar.price);
    const extras = getSelectedExtras();
    const extrasTotal = extras.reduce((sum, e) => sum + e.price * totalDays, 0);

    const pickup = getLocationById(document.getElementById("pickupLocation")?.value);
    const ret = getLocationById(document.getElementById("returnLocation")?.value);
    const locationFees = (pickup?.fee || 0) + (ret?.fee || 0);

    const total = carSubtotal + extrasTotal + locationFees;
    setSummary(totalDays, carSubtotal, extrasTotal, locationFees, total);
}

function setSummary(days, carSubtotal, extrasTotal, locationFees, total) {
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
    };

    setText("totalDays", days);
    setText("carSubtotal", formatMoney(carSubtotal));
    setText("extrasTotal", formatMoney(extrasTotal));
    setText("locationFees", formatMoney(locationFees));
    setText("totalPrice", formatMoney(total));
}

function isCarAvailable(carId, startDate, endDate) {
    const reservations = getJSON("reservations", []);

    return !reservations.some(reservation => {
        if (reservation.carId !== carId) return false;
        if (reservation.status === "Cancelled" || reservation.status === "Rejected") {
            return false;
        }

        const reservedStart = new Date(reservation.startDate);
        const reservedEnd = new Date(reservation.endDate);
        const selectedStart = new Date(startDate);
        const selectedEnd = new Date(endDate);

        return selectedStart <= reservedEnd && selectedEnd >= reservedStart;
    });
}

function saveReservation() {
    const loggedUser = getLoggedUser();

    if (!loggedUser) {
        showToast("Duhet të identifikoheni!");
        setTimeout(() => (window.location.href = "login.html"), 900);
        return;
    }

    const currentCar = getJSON("currentCar", null);
    if (!currentCar) {
        showToast("Makina nuk u gjet!");
        return;
    }

    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;
    const pickupId = document.getElementById("pickupLocation").value;
    const returnId = document.getElementById("returnLocation").value;
    const notes = document.getElementById("reservationNotes").value.trim();
    const paymentMethod = document.getElementById("paymentMethod").value;

    if (!startDate || !endDate || !pickupId || !returnId) {
        showToast("Plotëso të gjitha fushat!");
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start < today) {
        showToast("Data e fillimit nuk mund të jetë në të kaluarën!");
        return;
    }

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) {
        showToast("Datat nuk janë të vlefshme!");
        return;
    }

    if (!isCarAvailable(currentCar.id, startDate, endDate)) {
        showToast("Makina është e rezervuar në këto data!");
        return;
    }

    const extras = getSelectedExtras();
    const pickup = getLocationById(pickupId);
    const ret = getLocationById(returnId);
    const carSubtotal = totalDays * Number(currentCar.price);
    const extrasTotal = extras.reduce((sum, e) => sum + e.price * totalDays, 0);
    const locationFees = pickup.fee + ret.fee;
    const totalPrice = carSubtotal + extrasTotal + locationFees;

    let paymentStatus = "Pending";
    if (paymentMethod === "Card") {
        paymentStatus = "Paid (simulated)";
        showToast("Pagesa me kartë u simulua me sukses!");
    } else if (paymentMethod === "Bank transfer") {
        paymentStatus = "Awaiting transfer";
    } else {
        paymentStatus = "Pay on pickup";
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
        carSubtotal,
        extras,
        extrasTotal,
        pickupLocation: pickup.name,
        returnLocation: ret.name,
        locationFees,
        totalPrice,
        startDate,
        endDate,
        notes,
        paymentMethod,
        paymentStatus,
        document: uploadedDocument,
        status: "Confirmed",
        createdAt: new Date().toISOString()
    };

    const reservations = getJSON("reservations", []);
    reservations.push(reservation);
    setJSON("reservations", reservations);

    sendMockNotification(reservation);

    // optional API sync
    if (window.AutoRentAPI?.createReservation) {
        window.AutoRentAPI.createReservation(reservation).catch(() => {});
    }

    showToast("Rezervimi u krye! Njoftimi u dërgua.");
    setTimeout(() => {
        window.location.href = "myreservations.html";
    }, 1000);
}
