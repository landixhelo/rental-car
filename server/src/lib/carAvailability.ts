import type { PrismaClient, ReservationStatus } from "@prisma/client";

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

function isActiveOrUpcoming(r: BusyReservation, day = todayStamp()) {
  if (!["PENDING", "CONFIRMED"].includes(r.status)) return false;
  // Ended before today → ignore (e.g. 14→15 when today is 16)
  return dayStamp(new Date(r.endDate)) >= day;
}

function coversToday(r: BusyReservation, day = todayStamp()) {
  if (!isActiveOrUpcoming(r, day)) return false;
  const start = dayStamp(new Date(r.startDate));
  const end = dayStamp(new Date(r.endDate));
  return start <= day && day <= end;
}

export function effectiveCarStatus(
  storedStatus: "AVAILABLE" | "RESERVED" | "MAINTENANCE",
  reservations: BusyReservation[]
): "AVAILABLE" | "RESERVED" | "MAINTENANCE" {
  if (storedStatus === "MAINTENANCE") return "MAINTENANCE";

  const day = todayStamp();
  const busy = reservations.some((r) => coversToday(r, day));

  return busy ? "RESERVED" : "AVAILABLE";
}

export function currentReservationEnd(
  reservations: BusyReservation[]
): string | null {
  const day = todayStamp();
  const active = reservations
    .filter((r) => coversToday(r, day))
    .sort(
      (a, b) => dayStamp(new Date(b.endDate)) - dayStamp(new Date(a.endDate))
    );

  if (!active.length) return null;
  return new Date(dayStamp(new Date(active[0].endDate)))
    .toISOString()
    .slice(0, 10);
}

/** Only current + future PENDING/CONFIRMED ranges (past bookings are hidden). */
export function toBusyRanges(reservations: BusyReservation[]) {
  const day = todayStamp();
  return reservations
    .filter((r) => isActiveOrUpcoming(r, day))
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

/**
 * Half-open rental windows: [start, end).
 * Pickup on another booking's return day is allowed.
 */
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
  return aStart < bEnd && aEnd > bStart;
}

/** Mark past PENDING/CONFIRMED as COMPLETED and free stuck RESERVED cars. */
export async function healPastReservations(db: PrismaClient) {
  const today = new Date(todayStamp());

  const closed = await db.reservation.updateMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      endDate: { lt: today },
    },
    data: { status: "COMPLETED" },
  });

  const stillBusy = await db.reservation.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      endDate: { gte: today },
    },
    select: { carId: true },
    distinct: ["carId"],
  });
  const busyIds = stillBusy.map((r) => r.carId);

  await db.car.updateMany({
    where: {
      status: "RESERVED",
      ...(busyIds.length ? { id: { notIn: busyIds } } : {}),
    },
    data: { status: "AVAILABLE" },
  });

  return closed.count;
}

const activeStatuses: ReservationStatus[] = ["PENDING", "CONFIRMED"];

/** Prisma include: skip reservations that already ended before today (Tirana). */
export function activeReservationSelect() {
  const today = new Date(todayStamp());
  return {
    where: {
      status: { in: activeStatuses },
      endDate: { gte: today },
    },
    select: {
      startDate: true,
      endDate: true,
      status: true,
    },
  };
}
