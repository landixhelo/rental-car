import { Link } from "react-router-dom";
import type { Car } from "../lib/api";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";
import { carWhatsappText, whatsappHref } from "../lib/whatsapp";
import { useLocale, useT } from "../context/LocaleContext";

type Props = {
  car: Car;
  onToggleFavorite?: (car: Car) => void;
};

export default function FleetCarCard({ car, onToggleFavorite }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const wa = whatsappHref(carWhatsappText(car, locale));

  function statusLabel() {
    if (car.status === "RESERVED") return t("status.RESERVED");
    if (car.status === "MAINTENANCE") return t("status.MAINTENANCE");
    return t("cars.available");
  }

  return (
    <article className="pilot-car fleet-sell-card">
      <div className="pilot-car-media">
        <Link
          to={carPath(car)}
          className="pilot-car-photo"
          aria-label={`${car.brand} ${car.model}`}
        >
          <img
            src={mediaUrl(car.imageUrl)}
            alt={`${car.brand} ${car.model} ${car.year}`}
          />
        </Link>
        <span
          className={`pilot-car-badge status-${(
            car.status || "AVAILABLE"
          ).toLowerCase()}`}
        >
          {statusLabel()}
        </span>
        {onToggleFavorite ? (
          <button
            type="button"
            className={`pilot-fav${car.isFavorite ? " active" : ""}`}
            onClick={() => onToggleFavorite(car)}
            aria-label={t("nav.favorites")}
          >
            ♥
          </button>
        ) : null}
      </div>
      <div className="pilot-car-body">
        <div className="row-between">
          <div>
            <h3>
              <Link to={carPath(car)}>
                {car.brand} {car.model}
              </Link>
            </h3>
            <p className="pilot-car-loc">
              {car.year}
              {car.location ? ` · ${car.location}` : ""}
            </p>
          </div>
          <strong className="fleet-from-price">
            <small>{t("cars.fromPrice")}</small>
            €{car.pricePerDay}
            <small>{t("common.perDay")}</small>
          </strong>
        </div>
        <div className="pilot-car-specs is-four">
          <span>
            {t("cars.transmission")}
            <b>{car.transmission || "—"}</b>
          </span>
          <span>
            {t("cars.fuel")}
            <b>{car.fuel || "—"}</b>
          </span>
          <span>
            {t("cars.seats")}
            <b>
              {car.seats || "—"} {t("cars.seatsUnit")}
            </b>
          </span>
          <span>
            {t("cars.luggage")}
            <b>{car.luggage || "—"}</b>
          </span>
        </div>
        <div className="fleet-sell-actions">
          <Link to={carPath(car)} className="btn">
            {t("cars.bookNow")}
          </Link>
          <a
            className="btn btn-wa"
            href={wa}
            target="_blank"
            rel="noreferrer"
          >
            {t("cars.checkWhatsapp")}
          </a>
        </div>
      </div>
    </article>
  );
}
