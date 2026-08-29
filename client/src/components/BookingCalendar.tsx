import { useEffect, useMemo, useState } from "react";
import { useLocale, useT } from "../context/LocaleContext";
import {
  addDays,
  formatDay,
  isBusyDay,
  monthMatrix,
  rangeOverlapsBusy,
  rentalSpanDays,
  tiraneToday,
  type BusyRange,
} from "../lib/dates";

type Props = {
  startDate: string;
  endDate: string;
  busyRanges?: BusyRange[];
  minRentalDays?: number;
  maxRentalDays?: number;
  onChange: (startDate: string, endDate: string) => void;
};

type Field = "start" | "end";

function dayKey(value: string) {
  return value.slice(0, 10);
}

function fitsRentalSpan(
  start: string,
  end: string,
  minDays: number,
  maxDays: number
) {
  const days = rentalSpanDays(start, end);
  return days >= minDays && days <= maxDays;
}

export default function BookingCalendar({
  startDate,
  endDate,
  busyRanges = [],
  minRentalDays = 1,
  maxRentalDays = 365,
  onChange,
}: Props) {
  const t = useT();
  const { locale } = useLocale();
  const today = tiraneToday();
  const minDays = Math.max(1, minRentalDays);
  const maxDays = Math.max(minDays, maxRentalDays);
  const start = startDate ? dayKey(startDate) : "";
  const end = endDate ? dayKey(endDate) : "";
  const minEnd = start ? addDays(start, minDays) : "";
  const maxEnd = start ? addDays(start, maxDays) : "";
  const seed = start || today;
  const seedDate = new Date(`${seed}T12:00:00`);
  const [cursor, setCursor] = useState({
    y: seedDate.getFullYear(),
    m: seedDate.getMonth(),
  });
  const [activeField, setActiveField] = useState<Field>(() =>
    start && !end ? "end" : "start"
  );

  useEffect(() => {
    if (!start) setActiveField("start");
    else setActiveField("end");
  }, [start, end]);

  const cells = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m]
  );

  const intlLocale =
    locale === "sq" ? "sq-AL" : locale === "it" ? "it-IT" : "en-GB";
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale, { weekday: "short" });
    // Monday-first week starting 2024-01-01 (Monday)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(2024, 0, 1 + i));
      return fmt.format(d);
    });
  }, [intlLocale]);

  const title = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
  }).format(new Date(cursor.y, cursor.m, 1));

  function pick(day: string) {
    if (day < today) return;
    if (isBusyDay(day, busyRanges)) return;

    if (activeField === "start") {
      let nextEnd = end && end > day ? end : "";
      if (
        nextEnd &&
        (!fitsRentalSpan(day, nextEnd, minDays, maxDays) ||
          rangeOverlapsBusy(day, nextEnd, busyRanges))
      ) {
        nextEnd = "";
      }
      onChange(day, nextEnd);
      setActiveField("end");
      return;
    }

    // Selecting return date
    if (!start || day <= start) {
      onChange(day, "");
      setActiveField("end");
      return;
    }

    if (minEnd && day < minEnd) return;
    if (maxEnd && day > maxEnd) return;
    if (rangeOverlapsBusy(start, day, busyRanges)) return;
    onChange(start, day);
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

  const endHint =
    minDays > 1
      ? t("details.pickEndHintMin", { days: minDays })
      : t("details.pickEndHint");

  return (
    <div className="booking-calendar">
      <div className="booking-calendar-toolbar">
        <div className="booking-calendar-fields">
          <button
            type="button"
            className={`booking-calendar-field${
              activeField === "start" ? " is-active" : ""
            }`}
            onClick={() => setActiveField("start")}
          >
            <span className="muted">{t("details.startDate")}</span>
            <strong>{start || "—"}</strong>
          </button>
          <button
            type="button"
            className={`booking-calendar-field${
              activeField === "end" ? " is-active" : ""
            }`}
            onClick={() => {
              if (!start) {
                setActiveField("start");
                return;
              }
              setActiveField("end");
            }}
          >
            <span className="muted">{t("details.endDate")}</span>
            <strong>{end || "—"}</strong>
          </button>
        </div>
        <p className="booking-calendar-hint">
          {activeField === "start" ? t("details.pickStart") : endHint}
        </p>
      </div>

      <div className="row-between calendar-nav booking-calendar-nav">
        <button
          type="button"
          className="btn ghost"
          disabled={!canGoPrev}
          onClick={() => shiftMonth(-1)}
          aria-label={t("labels.prevMonth")}
        >
          ‹
        </button>
        <strong>{title}</strong>
        <button
          type="button"
          className="btn ghost"
          onClick={() => shiftMonth(1)}
          aria-label={t("labels.nextMonth")}
        >
          ›
        </button>
      </div>

      <div className="calendar-grid calendar-head booking-calendar-head">
        {weekdayLabels.map((d, i) => (
          <div key={`${d}-${i}`}>{d}</div>
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
          const isStart = key === start;
          const isEnd = key === end;
          const inRange =
            Boolean(start && end) && key > start && key < end;
          const blockedEnd =
            activeField === "end" &&
            Boolean(start && key > start) &&
            rangeOverlapsBusy(start, key, busyRanges);
          const tooShort =
            activeField === "end" &&
            Boolean(start && minEnd) &&
            key > start &&
            key < minEnd;
          const tooLong =
            activeField === "end" &&
            Boolean(start && maxEnd) &&
            key > maxEnd;
          const spanBlocked = (tooShort || tooLong) && !busy;
          const disabled = past || busy || blockedEnd || spanBlocked;

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              className={[
                "booking-day",
                past ? "is-past" : "",
                busy ? "is-busy" : "",
                spanBlocked && !inRange ? "is-too-short" : "",
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

      {minDays > 1 ? (
        <p className="muted booking-calendar-note">
          {t("details.minRentalHint", { days: minDays })}
        </p>
      ) : null}

      {activeField === "end" && start && minDays <= 1 ? (
        <p className="muted booking-calendar-note">{t("details.pickEndHint")}</p>
      ) : null}
    </div>
  );
}
