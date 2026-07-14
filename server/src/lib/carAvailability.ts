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
