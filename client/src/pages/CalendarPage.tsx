import { useEffect, useMemo, useState } from "react";
import FleetCalendar, {
  type FleetCalendarReservation,
} from "../components/FleetCalendar";
import { useOpsSearch } from "../components/OpsLayout";
import { useT } from "../context/LocaleContext";
import { useToast } from "../hooks/useToast";
import { api } from "../lib/api";

export default function CalendarPage() {
  const t = useT();
  const { query } = useOpsSearch();
  const { show } = useToast();
  const [rows, setRows] = useState<FleetCalendarReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [carKey, setCarKey] = useState("all");

  useEffect(() => {
    setLoading(true);
    api
      .fleetReservations()
      .then((res) => setRows(res.reservations || []))
      .catch((e) => show(e instanceof Error ? e.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [show, t]);

  const cars = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const label = `${r.car?.brand || ""} ${r.car?.model || ""}`.trim();
      if (label) map.set(label, label);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const carLabel = `${r.car?.brand || ""} ${r.car?.model || ""}`.trim();
      if (carKey !== "all" && carLabel !== carKey) return false;
      if (!q) return true;
      return (
        carLabel.toLowerCase().includes(q) ||
        (r.user?.fullName || "").toLowerCase().includes(q) ||
        (r.user?.email || "").toLowerCase().includes(q) ||
        (r.user?.phone || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, carKey]);

  return (
    <div className="ops-page">
      <header className="ops-page-head">
        <div>
          <h1>{t("contractor.calendar")}</h1>
          <p>{t("opsPages.calendarSub")}</p>
        </div>
        {cars.length ? (
          <label className="calendar-car-filter">
            <span className="sr-only">{t("contractor.calendarAllCars")}</span>
            <select
              value={carKey}
              onChange={(e) => setCarKey(e.target.value)}
            >
              <option value="all">{t("contractor.calendarAllCars")}</option>
              {cars.map((car) => (
                <option key={car} value={car}>
                  {car}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {loading ? (
        <p className="muted">{t("common.loading")}</p>
      ) : (
        <FleetCalendar reservations={filtered} />
      )}
    </div>
  );
}
