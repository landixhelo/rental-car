import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, type Car } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLocale, useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { mediaUrl } from "../lib/mediaUrl";
import { carPath } from "../lib/carPath";
import Seo from "../seo/Seo";
import { SITE } from "../seo/site";
import { breadcrumbJsonLd, itemListCarsJsonLd } from "../seo/jsonLd";
import { addDays, clampDate, tiraneToday } from "../lib/dates";

const PAGE_SIZE = 4;

const emptyFilters = {
  search: "",
  type: "all",
  status: "all",
  fuel: "all",
  transmission: "all",
  location: "all",
  seats: "all",
  minPrice: "20",
  maxPrice: "500",
  startDate: "",
  endDate: "",
  availableOnly: false,
};

type SortKey = "recommended" | "priceAsc" | "priceDesc" | "rating";

export default function CarsPage() {
  const [searchParams] = useSearchParams();
  const [cars, setCars] = useState<Car[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [filters, setFilters] = useState(() => ({
    ...emptyFilters,
    type: searchParams.get("type") || "all",
    location: searchParams.get("location") || "all",
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
  }));
  const { user } = useAuth();
  const { show, Toast } = useToast();
  const t = useT();
  const { locale } = useLocale();
  const today = tiraneToday();

  async function load(next = filters) {
    const params: Record<string, string> = {};
    Object.entries(next).forEach(([k, v]) => {
      if (k === "availableOnly" || k === "seats") return;
      if (v && v !== "all") params[k] = String(v);
    });
    if (next.availableOnly) params.status = "AVAILABLE";
    const res = await api.cars(params);
    setCars(res.cars);
    setPage(1);
  }

  useEffect(() => {
    const next = {
      ...emptyFilters,
      type: searchParams.get("type") || "all",
      location: searchParams.get("location") || "all",
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
    };
    setFilters(next);
    load(next).catch((e) => show(e.message));
  }, [searchParams]);

  async function toggleFavorite(car: Car) {
    if (!user) {
      show(t("common.requiredLogin"));
      return;
    }
    try {
      if (car.isFavorite) await api.removeFavorite(car.id);
      else await api.addFavorite(car.id);
      await load();
    } catch (e) {
      show(e instanceof Error ? e.message : t("common.error"));
    }
  }

  function clearAll() {
    setFilters(emptyFilters);
    load(emptyFilters).catch((e) => show(e.message));
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    load().catch((err) => show(err.message));
  }

  const filtered = useMemo(() => {
    let list = [...cars];
    if (filters.seats !== "all") {
      const seatN = Number(filters.seats);
      list = list.filter((c) =>
        filters.seats === "7" ? c.seats >= 7 : c.seats === seatN
      );
    }
    if (sort === "priceAsc") {
      list.sort((a, b) => a.pricePerDay - b.pricePerDay);
    } else if (sort === "priceDesc") {
      list.sort((a, b) => b.pricePerDay - a.pricePerDay);
    } else if (sort === "rating") {
      list.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
    }
    return list;
  }, [cars, filters.seats, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageCars = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function statusLabel(car: Car) {
    if (car.status === "RESERVED") return t("cars.reserved");
    if (car.status === "MAINTENANCE") return t("cars.maintenance");
    return t("cars.available");
  }

  const types = ["SUV", "Sedan", "Sports", "Luxury"] as const;
  const fuels = ["Petrol", "Diesel", "Electric", "Hybrid"] as const;
  const seatOpts = ["2", "4", "5", "7"] as const;

  return (
    <div className="fleet-page">
      <Seo
        title={t("cars.title")}
        description={SITE.description[locale]}
        path="/cars"
        locale={locale}
        keywords={SITE.keywords[locale]}
        jsonLd={[
          breadcrumbJsonLd([
            { name: SITE.name, path: "/" },
            { name: t("cars.title"), path: "/cars" },
          ]),
          itemListCarsJsonLd(cars),
        ]}
      />
      {Toast}

      <div className="fleet-hero">
        <h1>{t("cars.title")}</h1>
        <p>{t("cars.subtitle")}</p>
      </div>

      <form className="fleet-search" onSubmit={onSearchSubmit}>
        <label className="fleet-search-field">
          <span className="fleet-ico" aria-hidden>
            ⌕
          </span>
          <input
            placeholder={t("cars.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
        <label className="fleet-search-field">
          <span className="fleet-ico" aria-hidden>
            ⌖
          </span>
          <select
            value={filters.location}
            onChange={(e) =>
              setFilters({ ...filters, location: e.target.value })
            }
          >
            <option value="all">{t("cars.allLocations")}</option>
            <option value="Tiranë">Tiranë</option>
            <option value="Durrës">Durrës</option>
            <option value="Vlorë">Vlorë</option>
          </select>
        </label>
        <label className="fleet-search-field">
          <span className="fleet-ico" aria-hidden>
            📅
          </span>
          <input
            type="date"
            min={today}
            value={filters.startDate}
            onChange={(e) => {
              const start = clampDate(e.target.value, today);
              const end =
                filters.endDate && filters.endDate > start
                  ? filters.endDate
                  : start
                    ? addDays(start, 1)
                    : "";
              setFilters({ ...filters, startDate: start, endDate: end });
            }}
            aria-label={t("home.searchPickup")}
          />
        </label>
        <label className="fleet-search-field">
          <span className="fleet-ico" aria-hidden>
            📅
          </span>
          <input
            type="date"
            min={
              filters.startDate
                ? addDays(filters.startDate, 1)
                : addDays(today, 1)
            }
            value={filters.endDate}
            onChange={(e) => {
              const minEnd = filters.startDate
                ? addDays(filters.startDate, 1)
                : addDays(today, 1);
              setFilters({
                ...filters,
                endDate: clampDate(e.target.value, minEnd),
              });
            }}
            aria-label={t("home.searchReturn")}
          />
        </label>
        <button className="btn" type="submit">
          {t("cars.searchBtn")}
        </button>
      </form>

      <div className="fleet-layout">
        <aside className="fleet-sidebar">
          <div className="fleet-sidebar-head">
            <strong>{t("cars.filters")}</strong>
            <button type="button" className="fleet-clear" onClick={clearAll}>
              {t("cars.clearAll")}
            </button>
          </div>

          <div className="fleet-filter-block">
            <h4>{t("cars.pricePerDay")}</h4>
            <div className="fleet-price-row">
              <label>
                <span>€</span>
                <input
                  type="number"
                  min={0}
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minPrice: e.target.value })
                  }
                />
              </label>
              <span className="fleet-price-sep">–</span>
              <label>
                <span>€</span>
                <input
                  type="number"
                  min={0}
                  value={filters.maxPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, maxPrice: e.target.value })
                  }
                />
              </label>
            </div>
            <input
              className="fleet-range"
              type="range"
              min={20}
              max={500}
              value={Number(filters.maxPrice) || 500}
              onChange={(e) =>
                setFilters({ ...filters, maxPrice: e.target.value })
              }
            />
          </div>

          <div className="fleet-filter-block">
            <h4>{t("cars.carType")}</h4>
            <div className="fleet-check-list">
              {types.map((type) => (
                <label key={type} className="fleet-check">
                  <input
                    type="checkbox"
                    checked={filters.type === type}
                    onChange={() =>
                      setFilters({
                        ...filters,
                        type: filters.type === type ? "all" : type,
                      })
                    }
                  />
                  <span>{t(`labels.type.${type}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="fleet-filter-block">
            <h4>{t("cars.transmission")}</h4>
            <div className="fleet-seg">
              {(["Automatic", "Manual"] as const).map((tr) => (
                <button
                  key={tr}
                  type="button"
                  className={filters.transmission === tr ? "active" : undefined}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      transmission:
                        filters.transmission === tr ? "all" : tr,
                    })
                  }
                >
                  {t(`labels.transmission.${tr}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="fleet-filter-block">
            <h4>{t("cars.fuel")}</h4>
            <div className="fleet-check-list">
              {fuels.map((fuel) => (
                <label key={fuel} className="fleet-check">
                  <input
                    type="checkbox"
                    checked={filters.fuel === fuel}
                    onChange={() =>
                      setFilters({
                        ...filters,
                        fuel: filters.fuel === fuel ? "all" : fuel,
                      })
                    }
                  />
                  <span>{t(`labels.fuel.${fuel}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="fleet-filter-block">
            <h4>{t("cars.seats")}</h4>
            <div className="fleet-seg fleet-seg--seats">
              {seatOpts.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={filters.seats === s ? "active" : undefined}
                  onClick={() =>
                    setFilters({
                      ...filters,
                      seats: filters.seats === s ? "all" : s,
                    })
                  }
                >
                  {s === "7" ? "7+" : s}
                </button>
              ))}
            </div>
          </div>

          <div className="fleet-filter-block fleet-toggle-row">
            <span>{t("cars.availableOnly")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={filters.availableOnly}
              className={`fleet-switch${filters.availableOnly ? " on" : ""}`}
              onClick={() =>
                setFilters({
                  ...filters,
                  availableOnly: !filters.availableOnly,
                })
              }
            />
          </div>

          <button
            type="button"
            className="btn fleet-apply"
            onClick={() => load().catch((e) => show(e.message))}
          >
            {t("cars.filter")}
          </button>
        </aside>

        <div className="fleet-main">
          <div className="fleet-toolbar">
            <p>
              <strong>{filtered.length}</strong> {t("cars.availableCount")}
            </p>
            <label className="fleet-sort">
              <span>{t("cars.sortBy")}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="recommended">{t("cars.sortRecommended")}</option>
                <option value="priceAsc">{t("cars.sortPriceAsc")}</option>
                <option value="priceDesc">{t("cars.sortPriceDesc")}</option>
                <option value="rating">{t("cars.sortRating")}</option>
              </select>
            </label>
          </div>

          {!filtered.length ? (
            <p className="muted fleet-empty">{t("cars.noResults")}</p>
          ) : (
            <div className="fleet-grid">
              {pageCars.map((car) => (
                <article key={car.id} className="pilot-car fleet-car">
                  <div className="pilot-car-media">
                    <Link
                      to={carPath(car)}
                      className="pilot-car-photo"
                      aria-label={`${car.brand} ${car.model}`}
                    >
                      <img
                        src={mediaUrl(car.imageUrl)}
                        alt={`${car.brand} ${car.model}`}
                      />
                    </Link>
                    <span
                      className={`pilot-car-badge status-${(
                        car.status || "AVAILABLE"
                      ).toLowerCase()}`}
                    >
                      {statusLabel(car)}
                    </span>
                    <button
                      type="button"
                      className={`pilot-fav${car.isFavorite ? " active" : ""}`}
                      onClick={() => toggleFavorite(car)}
                      aria-label={t("nav.favorites")}
                    >
                      ♥
                    </button>
                  </div>
                  <div className="pilot-car-body">
                    <div className="row-between">
                      <h3>
                        <Link to={carPath(car)}>
                          {car.brand} {car.model}
                        </Link>
                      </h3>
                      <strong>
                        €{car.pricePerDay}
                        <small>{t("common.perDay")}</small>
                      </strong>
                    </div>
                    <p className="pilot-car-loc">{car.location}</p>
                    <div className="pilot-car-specs">
                      <span>
                        {t("cars.transmission")}
                        <b>{car.transmission || "—"}</b>
                      </span>
                      <span>
                        {t("cars.seats")}
                        <b>
                          {car.seats || "—"} {t("cars.seatsUnit")}
                        </b>
                      </span>
                      <span>
                        {t("cars.fuel")}
                        <b>{car.fuel || "—"}</b>
                      </span>
                    </div>
                    <div className="row-between pilot-car-foot">
                      <span className="pilot-rating">
                        ★ {car.ratingAvg || "—"}
                        <small>({car.ratingCount || 0})</small>
                      </span>
                      <Link to={carPath(car)} className="btn">
                        {t("home.viewDetails")}
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {filtered.length > PAGE_SIZE ? (
            <nav className="fleet-pager" aria-label="Pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === page ? "active" : undefined}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
