import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, type Car } from "../lib/api";

export default function HomePage() {
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    api.cars().then((r) => setCars(r.cars.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div>
      <section className="hero">
        <div className="hero-inner">
          <span className="eyebrow">PREMIUM CAR RENTAL</span>
          <h1>
            Përvoja e Drejtimit <span>Premium</span>
          </h1>
          <p>
            Zbuloni koleksionin tonë të makinave luksoze. Nga sedan elegante deri
            te SUV të fuqishme.
          </p>
          <div className="hero-actions">
            <Link to="/cars" className="btn">
              Eksploro Makinat
            </Link>
            <Link to="/register" className="btn ghost">
              Krijo Llogari
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Pse AutoRent?</h2>
        <div className="feature-grid">
          <div className="card">
            <h3>Flota Premium</h3>
            <p>Makina luksoze të modeleve të fundit</p>
          </div>
          <div className="card">
            <h3>Rezervim i Lehtë</h3>
            <p>Proces i thjeshtë online me extras dhe pagesë</p>
          </div>
          <div className="card">
            <h3>Siguri e Plotë</h3>
            <p>Auth i fortë, DB e mbrojtur dhe validim i plotë</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Makinat tona</h2>
        <div className="cars-grid">
          {cars.map((car) => (
            <Link key={car.id} to={`/cars/${car.id}`} className="car-card">
              <img src={car.imageUrl} alt={`${car.brand} ${car.model}`} />
              <div className="car-card-body">
                <h3>
                  {car.brand} {car.model}
                </h3>
                <span className="company-chip">{car.companyName || "AutoRent"}</span>
                <p className="muted">
                  €{car.pricePerDay}/ditë · ⭐ {car.ratingAvg || "-"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
