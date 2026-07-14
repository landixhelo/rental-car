import type { ReservationStatus } from "@prisma/client";

type BusyReservation = {
  startDate: Date;
  endDate: Date;
  status: string;
};

function dayStamp(value: Date) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate()
  );
}

/** Calendar "today" in Albania (business timezone). */
export function todayStamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tirane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return Date.UTC(year, month - 1, day);
}

export function effectiveCarStatus(
  storedStatus: "AVAILABLE" | "RESERVED" | "MAINTENANCE",
  reservations: BusyReservation[]
): "AVAILABLE" | "RESERVED" | "MAINTENANCE" {
  if (storedStatus === "MAINTENANCE") return "MAINTENANCE";

  const day = todayStamp();
  const busy = reservations.some((r) => {
    if (!["PENDING", "CONFIRMED"].includes(r.status)) return false;
    const start = dayStamp(new Date(r.startDate));
    const end = dayStamp(new Date(r.endDate));
    return start <= day && day <= end;
  });

  return busy ? "RESERVED" : "AVAILABLE";
}

export function currentReservationEnd(
  reservations: BusyReservation[]
): string | null {
  const day = todayStamp();
  const active = reservations
    .filter((r) => {
      if (!["PENDING", "CONFIRMED"].includes(r.status)) return false;
      const start = dayStamp(new Date(r.startDate));
      const end = dayStamp(new Date(r.endDate));
      return start <= day && day <= end;
    })
    .sort(
      (a, b) => dayStamp(new Date(b.endDate)) - dayStamp(new Date(a.endDate))
    );

  if (!active.length) return null;
  return new Date(dayStamp(new Date(active[0].endDate)))
    .toISOString()
    .slice(0, 10);
}

export function toBusyRanges(reservations: BusyReservation[]) {
  return reservations
    .filter((r) => ["PENDING", "CONFIRMED"].includes(r.status))
    .map((r) => ({
      startDate: new Date(dayStamp(new Date(r.startDate)))
        .toISOString()
        .slice(0, 10),
      endDate: new Date(dayStamp(new Date(r.endDate)))
        .toISOString()
        .slice(0, 10),
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function datesOverlap(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date
) {
  const aStart = dayStamp(new Date(startA));
  const aEnd = dayStamp(new Date(endA));
  const bStart = dayStamp(new Date(startB));
  const bEnd = dayStamp(new Date(endB));
  return aStart <= bEnd && aEnd >= bStart;
}

const activeStatuses: ReservationStatus[] = ["PENDING", "CONFIRMED"];

export const activeReservationSelect = {
  where: {
    status: { in: activeStatuses },
  },
  select: {
    startDate: true,
    endDate: true,
    status: true,
  },
};
