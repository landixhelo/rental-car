import { useMemo, useState } from "react";
import { useT } from "../context/LocaleContext";
import { formatDay, monthMatrix, tiraneToday } from "../lib/dates";

type ResItem = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  car?: { brand?: string; model?: string };
  user?: { fullName?: string };
};

/** Half-open [start, end). */
function overlaps(day: string, start: string, end: string) {
  const d = day.slice(0, 10);
  const s = String(start).slice(0, 10);
  const e = String(end).slice(0, 10);
  return d >= s && d < e;
}

export default function FleetCalendar({
  reservations,
}: {
  reservations: ResItem[];
}) {
  const t = useT();
  const today = tiraneToday();
  const now = new Date(`${today}T12:00:00`);
  const [cursor, setCursor] = useState({
    y: now.getFullYear(),
    m: now.getMonth(),
  });

  const cells = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m]
  );

  const active = reservations.filter((r) =>
    ["PENDING", "CONFIRMED"].includes(r.status)
  );

  const title = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(cursor.y, cursor.m, 1));

  return (
    <div className="fleet-calendar panel">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{t("contractor.calendar")}</h2>
        <div className="calendar-nav">
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setCursor((c) => {
                const d = new Date(c.y, c.m - 1, 1);
                return { y: d.getFullYear(), m: d.getMonth() };
              })
            }
          >
            ‹
          </button>
          <strong>{title}</strong>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setCursor((c) => {
                const d = new Date(c.y, c.m + 1, 1);
                return { y: d.getFullYear(), m: d.getMonth() };
              })
            }
          >
            ›
          </button>
        </div>
      </div>
      <div className="calendar-grid calendar-head">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
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
            overlaps(key, r.startDate, r.endDate)
          );
          return (
            <div
              key={key}
              className={`calendar-cell${hits.length ? " busy" : ""}${
                past ? " is-past" : ""
              }`}
              title={hits
                .map(
                  (r) =>
                    `${r.car?.brand || ""} ${r.car?.model || ""} — ${
                      r.user?.fullName || ""
                    }`
                )
                .join("\n")}
            >
              <span className="calendar-day">{cell.date.getDate()}</span>
              {hits.length ? (
                <span className="calendar-badge">{hits.length}</span>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ marginTop: 10, fontSize: "0.9rem" }}>
        {t("contractor.calendarHint")}
      </p>
    </div>
  );
}
