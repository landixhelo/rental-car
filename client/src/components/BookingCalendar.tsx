import { useMemo, useState } from "react";
import { useT } from "../context/LocaleContext";
import {
  formatDay,
  isBusyDay,
  monthMatrix,
  rangeOverlapsBusy,
  tiraneToday,
  type BusyRange,
} from "../lib/dates";

type Props = {
  startDate: string;
  endDate: string;
  busyRanges?: BusyRange[];
  onChange: (startDate: string, endDate: string) => void;
};

export default function BookingCalendar({
  startDate,
  endDate,
  busyRanges = [],
  onChange,
}: Props) {
  const t = useT();
  const today = tiraneToday();
  const seed = startDate || today;
  const seedDate = new Date(`${seed}T12:00:00`);
  const [cursor, setCursor] = useState({
    y: seedDate.getFullYear(),
    m: seedDate.getMonth(),
  });

  const cells = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m]
  );

  const title = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(cursor.y, cursor.m, 1));

  function pick(day: string) {
    if (day < today) return;
    if (isBusyDay(day, busyRanges)) return;

    // First click or restart: set start, clear end.
    if (!startDate || (startDate && endDate) || day <= startDate) {
      onChange(day, "");
      return;
    }

    // Second click: set end if the whole range is free.
    if (rangeOverlapsBusy(startDate, day, busyRanges)) return;
    onChange(startDate, day);
  }

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const canGoPrev = (() => {
    const view = new Date(cursor.y, cursor.m, 1);
    const todayDate = new Date(`${today}T12:00:00`);
    const todayMonth = new Date(
      todayDate.getFullYear(),
      todayDate.getMonth(),
      1
    );
    return view > todayMonth;
  })();

  return (
    <div className="booking-calendar">
      <div className="booking-calendar-toolbar">
        <div className="booking-calendar-fields">
          <div>
            <span className="muted">{t("details.startDate")}</span>
            <strong>{startDate || "—"}</strong>
          </div>
          <div>
            <span className="muted">{t("details.endDate")}</span>
            <strong>{endDate || "—"}</strong>
          </div>
        </div>
        <p className="booking-calendar-hint">
          {!startDate || endDate
            ? t("details.pickStart")
            : t("details.pickEnd")}
        </p>
      </div>

      <div className="row-between calendar-nav booking-calendar-nav">
        <button
          type="button"
          className="btn ghost"
          disabled={!canGoPrev}
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <strong>{title}</strong>
        <button
          type="button"
          className="btn ghost"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="calendar-grid calendar-head booking-calendar-head">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="calendar-grid booking-calendar-grid">
        {cells.map((cell, i) => {
          if (!cell.date) {
            return <div key={`e-${i}`} className="booking-day empty" />;
          }
          const key = formatDay(cell.date);
          const past = key < today;
          const busy = isBusyDay(key, busyRanges);
          const isStart = key === startDate;
          const isEnd = key === endDate;
          const inRange =
            Boolean(startDate && endDate) &&
            key > startDate &&
            key < endDate;
          const disabled = past || busy;
          const blockedEnd =
            Boolean(startDate && !endDate && key > startDate) &&
            rangeOverlapsBusy(startDate, key, busyRanges);

          return (
            <button
              key={key}
              type="button"
              disabled={disabled || blockedEnd}
              className={[
                "booking-day",
                past ? "is-past" : "",
                busy ? "is-busy" : "",
                isStart || isEnd ? "is-selected" : "",
                inRange ? "is-in-range" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => pick(key)}
              aria-label={key}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="booking-calendar-legend">
        <span>
          <i className="leg-past" /> {t("details.calendarPast")}
        </span>
        <span>
          <i className="leg-busy" /> {t("details.calendarBusy")}
        </span>
        <span>
          <i className="leg-ok" /> {t("details.calendarAvailable")}
        </span>
      </div>

      {startDate && !endDate ? (
        <p className="muted booking-calendar-note">{t("details.pickEndHint")}</p>
      ) : null}
    </div>
  );
}
