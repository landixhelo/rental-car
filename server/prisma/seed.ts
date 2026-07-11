import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const cars = [
  {
    brand: "BMW",
    model: "X5",
    year: 2023,
    pricePerDay: 85,
    seats: 5,
    doors: 5,
    luggage: 3,
    horsepower: "286",
    color: "E zezë",
    mileage: "18,000 km",
    location: "Tiranë",
    fuel: "Diesel",
    transmission: "Automatic",
    type: "SUV",
    description:
      "BMW X5 ofron komfort premium, hapësirë të madhe dhe teknologji moderne. Ideale për udhëtime familjare dhe rrugë të gjata në Shqipëri.",
    features: [
      "Navigacion GPS",
      "Kamera parkimi",
      "Ngrohje sediljesh",
      "Apple CarPlay",
      "Sensorë parkimi",
      "Klimë automatike",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
  },
  {
    brand: "Mercedes",
    model: "C-Class",
    year: 2022,
    pricePerDay: 70,
    seats: 5,
    doors: 4,
    luggage: 2,
    horsepower: "204",
    color: "Argjendi",
    mileage: "24,500 km",
    location: "Tiranë",
    fuel: "Petrol",
    transmission: "Automatic",
    type: "Sedan",
    description:
      "Mercedes C-Class është zgjedhja ideale për biznes dhe qytet. Stil elegant, vozitje e qetë dhe interier luksoz.",
    features: [
      "Leather seats",
      "Bluetooth",
      "Cruise control",
      "LED lights",
      "Keyless entry",
      "Park Assist",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80",
  },
  {
    brand: "Audi",
    model: "A4",
    year: 2021,
    pricePerDay: 65,
    seats: 5,
    doors: 4,
    luggage: 2,
    horsepower: "190",
    color: "E bardhë",
    mileage: "31,000 km",
    location: "Durrës",
    fuel: "Diesel",
    transmission: "Automatic",
    type: "Sedan",
    description:
      "Audi A4 kombinon performancë të qëndrueshme me stil modern. Perfekte për udhëtime ditore dhe javore me konsum të ulët.",
    features: [
      "Virtual Cockpit",
      "Android Auto",
      "Sensorë shi",
      "Klimë 2 zona",
      "Start/Stop",
      "ISOFIX",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80",
  },
  {
    brand: "Porsche",
    model: "911",
    year: 2023,
    pricePerDay: 180,
    seats: 2,
    doors: 2,
    luggage: 1,
    horsepower: "385",
    color: "E kuqe",
    mileage: "8,200 km",
    location: "Tiranë",
    fuel: "Petrol",
    transmission: "Automatic",
    type: "Sports",
    description:
      "Porsche 911 është ikona e sportscar. Përvojë unike drejtimi, fuqi e lartë dhe dizajn që tërheq vëmendjen kudo.",
    features: [
      "Sport Chrono",
      "Mode Sport+",
      "Sound System Bose",
      "Carbon package",
      "Launch control",
      "Adaptive suspension",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80",
  },
  {
    brand: "Range Rover",
    model: "Evoque",
    year: 2022,
    pricePerDay: 95,
    seats: 5,
    doors: 5,
    luggage: 3,
    horsepower: "249",
    color: "Gri",
    mileage: "21,000 km",
    location: "Vlorë",
    fuel: "Hybrid",
    transmission: "Automatic",
    type: "SUV",
    description:
      "Range Rover Evoque ofron stil luksoz dhe aftësi të mira off-road. Ideale për pushime dhe terrene të ndryshme.",
    features: [
      "4x4",
      "Panoramic roof",
      "Terrain Response",
      "Meridian Audio",
      "Heated steering",
      "360° camera",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80",
  },
  {
    brand: "Tesla",
    model: "Model 3",
    year: 2023,
    pricePerDay: 90,
    seats: 5,
    doors: 4,
    luggage: 2,
    horsepower: "283",
    color: "E bardhë",
    mileage: "12,400 km",
    location: "Tiranë",
    fuel: "Electric",
    transmission: "Automatic",
    type: "Sedan",
    description:
      "Tesla Model 3 është sedan elektrik me performancë të lartë, Autopilot dhe kosto të ulët operimi.",
    features: [
      "Autopilot",
      "Supercharging",
      "15\" touchscreen",
      "Glass roof",
      "Sentry Mode",
      "Over-the-air updates",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&q=80",
  },
];

async function main() {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
  const adminEmail = process.env.ADMIN_EMAIL || "landitir22@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345678";
  const adminName = process.env.ADMIN_NAME || "AutoRent Admin";

  const passwordHash = await bcrypt.hash(adminPassword, rounds);

  // Existing admin stays ADMIN; create/upgrade a SUPER_ADMIN master account
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: adminName,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      companyName: "AutoRent HQ",
    },
    create: {
      fullName: adminName,
      email: adminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      phone: "+355690000000",
      companyName: "AutoRent HQ",
      isActive: true,
    },
  });

  const contractorHash = await bcrypt.hash("Contractor@123", rounds);
  await prisma.user.upsert({
    where: { email: "contractor@autorent.al" },
    update: {
      role: "CONTRACTOR",
      isActive: true,
      companyName: "Tirana Fleet Partners",
    },
    create: {
      fullName: "Fleet Partner",
      email: "contractor@autorent.al",
      passwordHash: contractorHash,
      role: "CONTRACTOR",
      phone: "+355691111111",
      companyName: "Tirana Fleet Partners",
      isActive: true,
    },
  });

  const count = await prisma.car.count();
  if (count === 0) {
    const contractor = await prisma.user.findUnique({
      where: { email: "contractor@autorent.al" },
    });
    await prisma.car.createMany({
      data: cars.map((car) => ({
        ...car,
        ownerId: contractor?.id,
      })),
    });
  }

  console.log("Seed complete");
  console.log(`Super Admin: ${adminEmail} / ${adminPassword}`);
  console.log("Contractor: contractor@autorent.al / Contractor@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
