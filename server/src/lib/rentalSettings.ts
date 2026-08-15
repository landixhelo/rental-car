export type BusinessHourDay =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type BusinessHourRow = {
  day: BusinessHourDay;
  open: boolean;
  from?: string;
  to?: string;
};

export const DEFAULT_BUSINESS_HOURS: BusinessHourRow[] = [
  { day: "mon", open: true, from: "08:00", to: "20:00" },
  { day: "tue", open: true, from: "08:00", to: "20:00" },
  { day: "wed", open: true, from: "08:00", to: "20:00" },
  { day: "thu", open: true, from: "08:00", to: "20:00" },
  { day: "fri", open: true, from: "08:00", to: "20:00" },
  { day: "sat", open: true, from: "09:00", to: "18:00" },
  { day: "sun", open: false, from: "09:00", to: "18:00" },
];

export function normalizeBusinessHours(
  value: unknown
): BusinessHourRow[] {
  if (!Array.isArray(value) || value.length === 0) {
    return DEFAULT_BUSINESS_HOURS.map((d) => ({ ...d }));
  }
  const byDay = new Map<string, BusinessHourRow>();
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const day = String(r.day || "");
    if (!DEFAULT_BUSINESS_HOURS.some((d) => d.day === day)) continue;
    byDay.set(day, {
      day: day as BusinessHourDay,
      open: Boolean(r.open),
      from: typeof r.from === "string" ? r.from : "08:00",
      to: typeof r.to === "string" ? r.to : "20:00",
    });
  }
  return DEFAULT_BUSINESS_HOURS.map(
    (d) => byDay.get(d.day) || { ...d }
  );
}

export function formatHoursSummary(hours: BusinessHourRow[]): string {
  const open = hours.filter((h) => h.open);
  if (!open.length) return "Closed";
  const first = open[0];
  const same = open.every((h) => h.from === first.from && h.to === first.to);
  if (same && open.length >= 5) {
    return `${first.from} – ${first.to}`;
  }
  return open
    .slice(0, 3)
    .map((h) => `${h.day.toUpperCase()} ${h.from}-${h.to}`)
    .join(", ");
}
