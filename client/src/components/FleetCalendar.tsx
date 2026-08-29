import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLocale, useT } from "../context/LocaleContext";
import { formatShortDate } from "../lib/bookingDraft";
import { formatDay, monthMatrix, tiraneToday } from "../lib/dates";
import { statusLabel } from "../lib/labels";
import { mediaUrl } from "../lib/mediaUrl";
import { customerHistoryLocation, reservationLocation } from "../lib/returnTo";

export type FleetCalendarReservation = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice?: number;
  pickupLocation?: string;
  returnLocation?: string;
  car?: {
    brand?: string;
    model?: string;
    year?: number;
    imageUrl?: string | null;
  };
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string | null;
  };
};

const OCCUPIED = new Set(["PENDING", "CONFIRMED", "COMPLETED"]);

/** Half-open [start, end). */
export function overlapsDay(day: string, start: string, end: string) {
  const d = day.slice(0, 10);
  const s = String(start).slice(0, 10);
  const e = String(end).slice(0, 10);
  return d >= s && d < e;
}

function localeTag(locale: string) {
  return locale === "sq" ? "sq-AL" : locale === "it" ? "it-IT" : "en-GB";
}

function formatLongDay(iso: string, locale: string) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default function FleetCalendar({
  reservations,
}: {
  reservations: FleetCalendarReservation[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const today = tiraneToday();
  const now = new Date(`${today}T12:00:00`);
  const [cursor, setCursor] = useState({
    y: now.getFullYear(),
    m: now.getMonth(),
  });
  const [selected, setSelected] = useState(today);
  const listRef = useRef<HTMLDivElement>(null);
  const skipScroll = useRef(true);

  useEffect(() => {
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  const cells = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m]
  );

  const active = useMemo(
    () => reservations.filter((r) => OCCUPIED.has(r.status)),
    [reservations]
  );

  const intlLocale = localeTag(locale);
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(2024, 0, 1 + i));
      return fmt.format(d);
    });
  }, [intlLocale]);

  const title = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
  }).format(new Date(cursor.y, cursor.m, 1));

  const dayHits = useMemo(
    () =>
      active
        .filter((r) => overlapsDay(selected, r.startDate, r.endDate))
        .sort((a, b) => {
          const carA = `${a.car?.brand || ""} ${a.car?.model || ""}`;
          const carB = `${b.car?.brand || ""} ${b.car?.model || ""}`;
          return carA.localeCompare(carB);
        }),
    [active, selected]
  );

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function goToday() {
    setCursor({ y: now.getFullYear(), m: now.getMonth() });
    setSelected(today);
  }

  return (
    <div className="fleet-calendar panel" id="calendar">
      <div className="row-between fleet-calendar-toolbar">
        <h2 style={{ margin: 0 }}>{t("contractor.calendar")}</h2>
        <div className="calendar-nav">
          <button type="button" className="btn ghost" onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <strong>{title}</strong>
          <button type="button" className="btn ghost" onClick={() => shiftMonth(1)}>
            ›
          </button>
          <button type="button" className="btn ghost" onClick={goToday}>
            {t("contractor.calendarToday")}
          </button>
        </div>
      </div>
      <div className="calendar-grid calendar-head">
        {weekdayLabels.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((cell, i) => {
          if (!cell.date) {
            return <div key={`e-${i}`} className="calendar-cell empty" />;
          }
          const key = formatDay(cell.date);
          const past = key < today;
          const hits = active.filter((r) =>
            overlapsDay(key, r.startDate, r.endDate)
          );
          const isSelected = key === selected;
          return (
            <button
              type="button"
              key={key}
              className={`calendar-cell${hits.length ? " busy" : ""}${
                past ? " is-past" : ""
              }${key === today ? " is-today" : ""}${
                isSelected ? " selected" : ""
              }`}
              onClick={() => setSelected(key)}
              aria-pressed={isSelected}
              aria-label={`${formatLongDay(key, locale)}${
                hits.length ? `, ${hits.length}` : ""
              }`}
            >
              <span className="calendar-day">{cell.date.getDate()}</span>
              {hits.length ? (
                <span className="calendar-badge">{hits.length}</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="muted calendar-hint">{t("contractor.calendarHint")}</p>

      <div className="calendar-day-panel" ref={listRef}>
        <div className="calendar-day-head">
          <h3>
            {t("contractor.calendarDayTitle", {
              date: formatLongDay(selected, locale),
            })}
          </h3>
          <span className="ops-page-count">
            {dayHits.length} {t("opsPages.bookings").toLowerCase()}
          </span>
        </div>
        {!dayHits.length ? (
          <p className="muted">{t("contractor.calendarEmptyDay")}</p>
        ) : (
          <div className="calendar-day-list">
            {dayHits.map((r) => {
              const start = String(r.startDate).slice(0, 10);
              const end = String(r.endDate).slice(0, 10);
              const carLabel = `${r.car?.brand || ""} ${r.car?.model || ""}`.trim();
              return (
                <article key={r.id} className="calendar-booking">
                  <div className="calendar-booking-media">
                    {r.car?.imageUrl ? (
                      <img src={mediaUrl(r.car.imageUrl)} alt={carLabel} />
                    ) : (
                      <span aria-hidden>🚗</span>
                    )}
                  </div>
                  <div className="calendar-booking-body">
                    <h4>{carLabel || "—"}</h4>
                    <p>
                      {r.user?.id ? (
                        <Link
                          to={customerHistoryLocation(r.user.id, "/calendar")}
                        >
                          <strong>{r.user?.fullName || "—"}</strong>
                        </Link>
                      ) : (
                        <strong>{r.user?.fullName || "—"}</strong>
                      )}
                      {r.user?.phone ? (
                        <>
                          {" · "}
                          <a href={`tel:${r.user.phone}`}>{r.user.phone}</a>
                        </>
                      ) : null}
                    </p>
                    {r.user?.email ? (
                      <p className="muted">{r.user.email}</p>
                    ) : null}
                    <p>
                      {formatShortDate(start, locale)} → {formatShortDate(end, locale)}
                      {r.pickupLocation ? ` · ${r.pickupLocation}` : ""}
                    </p>
                    <span className="res-status-pill">{statusLabel(t, r.status)}</span>
                  </div>
                  <div className="calendar-booking-side">
                    {r.totalPrice != null ? (
                      <strong>€{Number(r.totalPrice)}</strong>
                    ) : null}
                    <Link
                      to={reservationLocation(r.id, "/calendar")}
                      className="btn ghost"
                    >
                      {t("contractor.openBooking")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
