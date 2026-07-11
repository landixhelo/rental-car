function getDemoCars() {

    return [

        {
            id: 1,
            brand: "BMW",
            model: "X5",
            year: "2023",
            price: "85",
            seats: "5",
            doors: "5",
            luggage: "3",
            horsepower: "286",
            color: "E zezë",
            mileage: "18,000 km",
            location: "Tiranë",
            fuel: "Diesel",
            transmission: "Automatic",
            type: "SUV",
            status: "Disponueshme",
            description: "BMW X5 ofron komfort premium, hapësirë të madhe dhe teknologji moderne. Ideale për udhëtime familjare dhe rrugë të gjata në Shqipëri.",
            features: [
                "Navigacion GPS",
                "Kamera parkimi",
                "Ngrohje sediljesh",
                "Apple CarPlay",
                "Sensorë parkimi",
                "Klimë automatike"
            ],
            image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80"
        },

        {
            id: 2,
            brand: "Mercedes",
            model: "C-Class",
            year: "2022",
            price: "70",
            seats: "5",
            doors: "4",
            luggage: "2",
            horsepower: "204",
            color: "Argjendi",
            mileage: "24,500 km",
            location: "Tiranë",
            fuel: "Petrol",
            transmission: "Automatic",
            type: "Sedan",
            status: "Disponueshme",
            description: "Mercedes C-Class është zgjedhja ideale për biznes dhe qytet. Stil elegant, vozitje e qetë dhe interier luksoz.",
            features: [
                "Leather seats",
                "Bluetooth",
                "Cruise control",
                "LED lights",
                "Keyless entry",
                "Park Assist"
            ],
            image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80"
        },

        {
            id: 3,
            brand: "Audi",
            model: "A4",
            year: "2021",
            price: "65",
            seats: "5",
            doors: "4",
            luggage: "2",
            horsepower: "190",
            color: "E bardhë",
            mileage: "31,000 km",
            location: "Durrës",
            fuel: "Diesel",
            transmission: "Automatic",
            type: "Sedan",
            status: "Disponueshme",
            description: "Audi A4 kombinon performancë të qëndrueshme me stil modern. Perfekte për udhëtime ditore dhe javore me konsum të ulët.",
            features: [
                "Virtual Cockpit",
                "Android Auto",
                "Sensorë shi",
                "Klimë 2 zona",
                "Start/Stop",
                "ISOFIX"
            ],
            image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80"
        },

        {
            id: 4,
            brand: "Porsche",
            model: "911",
            year: "2023",
            price: "180",
            seats: "2",
            doors: "2",
            luggage: "1",
            horsepower: "385",
            color: "E kuqe",
            mileage: "8,200 km",
            location: "Tiranë",
            fuel: "Petrol",
            transmission: "Automatic",
            type: "Sports",
            status: "Disponueshme",
            description: "Porsche 911 është ikona e sportscar. Përvojë unike drejtimi, fuqi e lartë dhe dizajn që tërheq vëmendjen kudo.",
            features: [
                "Sport Chrono",
                "Mode Sport+",
                "Sound System Bose",
                "Carbon package",
                "Launch control",
                "Adaptive suspension"
            ],
            image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80"
        },

        {
            id: 5,
            brand: "Range Rover",
            model: "Evoque",
            year: "2022",
            price: "95",
            seats: "5",
            doors: "5",
            luggage: "3",
            horsepower: "249",
            color: "Gri",
            mileage: "21,000 km",
            location: "Vlorë",
            fuel: "Hybrid",
            transmission: "Automatic",
            type: "SUV",
            status: "Disponueshme",
            description: "Range Rover Evoque ofron stil luksoz dhe aftësi të mira off-road. Ideale për pushime dhe terrene të ndryshme.",
            features: [
                "4x4",
                "Panoramic roof",
                "Terrain Response",
                "Meridian Audio",
                "Heated steering",
                "360° camera"
            ],
            image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80"
        },

        {
            id: 6,
            brand: "Tesla",
            model: "Model 3",
            year: "2023",
            price: "90",
            seats: "5",
            doors: "4",
            luggage: "2",
            horsepower: "283",
            color: "E bardhë",
            mileage: "12,400 km",
            location: "Tiranë",
            fuel: "Electric",
            transmission: "Automatic",
            type: "Sedan",
            status: "Disponueshme",
            description: "Tesla Model 3 është sedan elektrik me performancë të lartë, Autopilot dhe kosto të ulët operimi. E qetë, e shpejtë dhe moderne.",
            features: [
                "Autopilot",
                "Supercharging",
                "15\" touchscreen",
                "Glass roof",
                "Sentry Mode",
                "Over-the-air updates"
            ],
            image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80"
        }

    ];

}

function seedDemoCars() {

    const existing =
        JSON.parse(localStorage.getItem("cars")) || [];

    if (existing.length === 0) {

        localStorage.setItem(
            "cars",
            JSON.stringify(getDemoCars())
        );

        return;

    }

    enrichCars();

    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    const existingIds = new Set(cars.map(c => c.id));

    const missing =
        getDemoCars().filter(car => !existingIds.has(car.id));

    if (missing.length > 0) {

        localStorage.setItem(
            "cars",
            JSON.stringify([...cars, ...missing])
        );

    }

}

function enrichCars() {

    const cars =
        JSON.parse(localStorage.getItem("cars")) || [];

    const demoById = {};

    getDemoCars().forEach(car => {
        demoById[car.id] = car;
    });

    const enriched = cars.map(car => {

        const demo = demoById[car.id];

        if (demo) {

            return {
                ...demo,
                ...car,
                doors: car.doors || demo.doors,
                luggage: car.luggage || demo.luggage,
                horsepower: car.horsepower || demo.horsepower,
                color: car.color || demo.color,
                mileage: car.mileage || demo.mileage,
                location: car.location || demo.location,
                features:
                    (car.features && car.features.length >= 4)
                        ? car.features
                        : demo.features,
                description:
                    (car.description && car.description.length > 100)
                        ? car.description
                        : demo.description,
                image: car.image || demo.image
            };

        }

        return {

            doors: "4",
            luggage: "2",
            horsepower: "-",
            color: "-",
            mileage: "-",
            location: "Tiranë",
            features: [],
            description:
                car.description ||
                "Makinë premium në gjendje të mirë, ideale për udhëtime dhe përdorim të përditshëm.",
            ...car,
            features: Array.isArray(car.features) ? car.features : []

        };

    });

    localStorage.setItem("cars", JSON.stringify(enriched));

}
