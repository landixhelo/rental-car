/** Local calendar day in Europe/Tirane as YYYY-MM-DD. */
export function tiraneToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tirane",
  }).format(new Date());
}

/** Format a Date as YYYY-MM-DD in local calendar parts. */
export function formatDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatDay(d);
}

/** Whole days between pickup and return, matching server calcDays. */
export function rentalSpanDays(start: string, end: string) {
  const a = start.slice(0, 10);
  const b = end.slice(0, 10);
  if (!a || !b) return 0;
  const ms =
    new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function clampDate(value: string, min: string, max?: string) {
  const v = value.slice(0, 10);
  if (!v) return v;
  if (v < min) return min;
  if (max && v > max) return max;
  return v;
}

export type BusyRange = { startDate: string; endDate: string };

/** Half-open [start, end): return day is free for the next pickup. */
export function isBusyDay(day: string, ranges: BusyRange[]) {
  const d = day.slice(0, 10);
  return ranges.some((r) => {
    const s = String(r.startDate).slice(0, 10);
    const e = String(r.endDate).slice(0, 10);
    return d >= s && d < e;
  });
}

export function rangeOverlapsBusy(
  start: string,
  end: string,
  ranges: BusyRange[]
) {
  const a = start.slice(0, 10);
  const b = end.slice(0, 10);
  if (!a || !b || b <= a) return false;
  return ranges.some((r) => {
    const s = String(r.startDate).slice(0, 10);
    const e = String(r.endDate).slice(0, 10);
    return a < e && b > s;
  });
}

export function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null });
  return cells;
}
