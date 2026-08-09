import { Link, useNavigate } from "react-router-dom";
import type { Car } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";
import { useT } from "../context/LocaleContext";

type Props = {
  car: Car;
  onToggleFavorite?: (car: Car) => void;
};

export default function CarCard({ car, onToggleFavorite }: Props) {
  const t = useT();
  const navigate = useNavigate();

  function statusLabel() {
    if (car.status === "RESERVED") {
      return car.reservedUntil
        ? `${t("status.RESERVED")} · ${t("details.until")} ${car.reservedUntil}`
        : t("status.RESERVED");
    }
    if (car.status === "MAINTENANCE") return t("status.MAINTENANCE");
    return t("status.AVAILABLE");
  }

  return (
    <div className="car-card-wrap">
      <Link to={carPath(car)} className="car-card">
        <img
          src={mediaUrl(car.imageUrl)}
          alt={`${car.brand} ${car.model}`}
        />
        <div className="car-card-body">
          <div className="row-between">
            <h3>
              {car.brand} {car.model}
            </h3>
            <strong className="car-price">€{car.pricePerDay}</strong>
          </div>
          <span
            className={`company-chip${car.shopSlug ? " is-link" : ""}`}
            role={car.shopSlug ? "link" : undefined}
            tabIndex={car.shopSlug ? 0 : undefined}
            onClick={
              car.shopSlug
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/shops/${car.shopSlug}`);
                  }
                : undefined
            }
            onKeyDown={
              car.shopSlug
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/shops/${car.shopSlug}`);
                    }
                  }
                : undefined
            }
          >
            {car.companyName || "AutoRent"}
          </span>
          <span
            className={`status-chip status-${(car.status || "AVAILABLE").toLowerCase()}`}
          >
            {statusLabel()}
          </span>
          <p className="muted car-meta">
            {car.year}
            {car.color ? ` · ${car.color}` : ""}
            {car.mileage ? ` · ${car.mileage}` : ""}
            {" · "}
            {car.location} · ⭐ {car.ratingAvg || "-"} ({car.ratingCount || 0})
          </p>
          <p className="clamp">{car.description}</p>
        </div>
      </Link>
      {onToggleFavorite ? (
        <button
          type="button"
          className={`fav-btn ${car.isFavorite ? "active" : ""}`}
          onClick={() => onToggleFavorite(car)}
        >
          ♥
        </button>
      ) : null}
    </div>
  );
}
