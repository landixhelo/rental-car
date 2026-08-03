import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Car } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";

export default function FavoritesPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const { show, Toast } = useToast();
  const t = useT();

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
      <h1>{t("favorites.title")}</h1>
      {!cars.length && (
        <div className="panel">
          <p>{t("favorites.empty")}</p>
          <Link className="btn" to="/cars">
            {t("favorites.browse")}
          </Link>
        </div>
      )}
      <div className="cars-grid">
        {cars.map((car) => (
          <div key={car.id} className="car-card-wrap">
            <Link to={`/cars/${(car.slug || "").trim() || car.id}`} className="car-card">
              <img src={mediaUrl(car.imageUrl)} alt="" />
              <div className="car-card-body">
                <h3>
                  {car.brand} {car.model}
                </h3>
                <span className="company-chip">{car.companyName || "AutoRent"}</span>
                <p className="muted">
                  €{car.pricePerDay}
                  {t("common.perDay")}
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
