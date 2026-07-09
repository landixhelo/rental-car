document.addEventListener("DOMContentLoaded", () => {

    loadCarDetails();

});

function loadCarDetails() {

    // Marrim id nga URL
    const params = new URLSearchParams(window.location.search);

    const carId = Number(params.get("id"));

    // Marrim makinat
    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    // Gjejmë makinën
    const car =
        cars.find(c => c.id === carId);

    // Nëse nuk ekziston
    if (!car) {

        showToast("Makina nuk u gjet!");

        setTimeout(() => {

            window.location.href = "cars.html";

        }, 1500);

        return;

    }

    localStorage.setItem(
    "currentCar",
    JSON.stringify(car)
);

    // Plotësojmë faqen

    document.getElementById("carImage").src =
        car.image;

    document.getElementById("carImage").alt =
        `${car.brand} ${car.model}`;

    document.getElementById("carType").innerText =
        car.type;

    document.getElementById("carTitle").innerText =
        `${car.brand} ${car.model}`;

    document.getElementById("carYear").innerText =
        car.year;

    document.getElementById("carPrice").innerText =
        `€${car.price}`;

    document.getElementById("carSeats").innerText =
        car.seats;

    document.getElementById("carFuel").innerText =
        car.fuel;

    document.getElementById("carTransmission").innerText =
        car.transmission;

    document.getElementById("carDescription").innerText =
        car.description ||
        "Makinë premium në gjendje perfekte, ideale për udhëtime dhe përdorim të përditshëm.";

}