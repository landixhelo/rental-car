import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { useToast } from "../hooks/useToast";

export default function FavoritesPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const { show, Toast } = useToast();

  async function load() {
    const res = await api.favorites();
    setCars(res.favorites.map((f) => f.car));
  }

  useEffect(() => {
    load().catch((e) => show(e.message));
  }, []);

  async function remove(id: string) {
    await api.removeFavorite(id);
    await load();
  }

  return (
    <div className="section">
      {Toast}
      <h1>Favoritet</h1>
      {!cars.length && (
        <div className="panel">
          <p>Nuk ke favoritet.</p>
          <Link className="btn" to="/cars">
            Shiko Makinat
          </Link>
        </div>
      )}
      <div className="cars-grid">
        {cars.map((car) => (
          <div key={car.id} className="car-card-wrap">
            <Link to={`/cars/${car.id}`} className="car-card">
              <img src={car.imageUrl} alt="" />
              <div className="car-card-body">
                <h3>
                  {car.brand} {car.model}
                </h3>
                <p>
                  {car.companyName || "AutoRent"} · €{car.pricePerDay}/ditë
                </p>
              </div>
            </Link>
            <button className="fav-btn active" onClick={() => remove(car.id)}>
              ♥
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
