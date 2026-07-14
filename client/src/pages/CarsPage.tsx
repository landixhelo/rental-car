import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";

const emptyFilters = {
  search: "",
  type: "all",
  status: "all",
  fuel: "all",
  transmission: "all",
  location: "all",
  minPrice: "",
  maxPrice: "",
};

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const { user } = useAuth();
  const { show, Toast } = useToast();

  async function load(next = filters) {
    const params: Record<string, string> = {};
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== "all") params[k] = v;
    });
    const res = await api.cars(params);
    setCars(res.cars);
  }

  useEffect(() => {
    load().catch((e) => show(e.message));
  }, []);

  async function toggleFavorite(car: Car) {
    if (!user) {
      show("Duhet të identifikoheni");
      return;
    }
    try {
      if (car.isFavorite) await api.removeFavorite(car.id);
      else await api.addFavorite(car.id);
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="section">
      {Toast}
      <h1>Flota Jonë</h1>
      <div className="filters">
        <input
          placeholder="Kërko..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="all">Tipi</option>
          <option>SUV</option>
          <option>Sedan</option>
          <option>Sports</option>
          <option>Luxury</option>
        </select>
        <select
          value={filters.fuel}
          onChange={(e) => setFilters({ ...filters, fuel: e.target.value })}
        >
          <option value="all">Karburant</option>
          <option>Petrol</option>
          <option>Diesel</option>
          <option>Hybrid</option>
          <option>Electric</option>
        </select>
        <select
          value={filters.transmission}
          onChange={(e) =>
            setFilters({ ...filters, transmission: e.target.value })
          }
        >
          <option value="all">Transmision</option>
          <option>Automatic</option>
          <option>Manual</option>
        </select>
        <select
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        >
          <option value="all">Vendndodhja</option>
          <option>Tiranë</option>
          <option>Durrës</option>
          <option>Vlorë</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">Statusi</option>
          <option value="AVAILABLE">Disponueshme</option>
          <option value="RESERVED">E rezervuar</option>
          <option value="MAINTENANCE">Mirëmbajtje</option>
        </select>
        <input
          type="number"
          placeholder="Min €"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />
        <input
          type="number"
          placeholder="Max €"
          value={filters.maxPrice}
          onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
        />
        <button className="btn" onClick={() => load()}>
          Filtro
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setFilters(emptyFilters);
            load(emptyFilters);
          }}
        >
          Pastro
        </button>
      </div>

      <p>{cars.length} makina të gjetura</p>
      <div className="cars-grid">
        {cars.map((car) => (
          <div key={car.id} className="car-card-wrap">
            <Link to={`/cars/${car.id}`} className="car-card">
              <img src={car.imageUrl} alt={`${car.brand} ${car.model}`} />
              <div className="car-card-body">
                <div className="row-between">
                  <h3>
                    {car.brand} {car.model}
                  </h3>
                  <strong>€{car.pricePerDay}</strong>
                </div>
                <p className="muted">
                  {car.companyName || "AutoRent"} · {car.year} · {car.location} ·
                  ⭐ {car.ratingAvg || "-"} ({car.ratingCount || 0})
                </p>
                <p className="clamp">{car.description}</p>
              </div>
            </Link>
            <button
              className={`fav-btn ${car.isFavorite ? "active" : ""}`}
              onClick={() => toggleFavorite(car)}
            >
              ♥
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
