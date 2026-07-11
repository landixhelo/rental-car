const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, "db.json");

app.use(cors());
app.use(express.json({ limit: "5mb" }));

function readDB() {
    if (!fs.existsSync(DB_PATH)) {
        const initial = {
            cars: [],
            users: [],
            reservations: [],
            reviews: [],
            contactMessages: []
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "autorent-api" });
});

app.get("/api/cars", (_req, res) => {
    res.json(readDB().cars || []);
});

app.post("/api/cars", (req, res) => {
    const db = readDB();
    const car = { id: Date.now(), ...req.body };
    db.cars.push(car);
    writeDB(db);
    res.status(201).json(car);
});

app.get("/api/reservations", (_req, res) => {
    res.json(readDB().reservations || []);
});

app.post("/api/reservations", (req, res) => {
    const db = readDB();
    const reservation = { id: Date.now(), ...req.body };
    db.reservations.push(reservation);
    writeDB(db);
    res.status(201).json(reservation);
});

app.get("/api/reviews", (_req, res) => {
    res.json(readDB().reviews || []);
});

app.post("/api/reviews", (req, res) => {
    const db = readDB();
    const review = { id: Date.now(), ...req.body };
    db.reviews.push(review);
    writeDB(db);
    res.status(201).json(review);
});

app.post("/api/contact", (req, res) => {
    const db = readDB();
    const message = { id: Date.now(), ...req.body, createdAt: new Date().toISOString() };
    db.contactMessages = db.contactMessages || [];
    db.contactMessages.unshift(message);
    writeDB(db);
    res.status(201).json(message);
});

app.get("/api/stats", (_req, res) => {
    const db = readDB();
    const active = (db.reservations || []).filter(
        r => r.status !== "Cancelled" && r.status !== "Rejected"
    );
    const revenue = active.reduce((sum, r) => sum + Number(r.totalPrice || 0), 0);
    res.json({
        cars: (db.cars || []).length,
        users: (db.users || []).length,
        reservations: active.length,
        revenue
    });
});

app.listen(PORT, () => {
    console.log(`AutoRent API running on http://localhost:${PORT}`);
});
