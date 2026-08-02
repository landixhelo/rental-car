import { AppError } from "../middleware/error.js";
import { env } from "../config/env.js";

function dayStamp(value: Date) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate()
  );
}

/** Hours before pickup when free cancel is still allowed. */
export function cancelFreeHours() {
  return env.CANCEL_FREE_HOURS;
}

/** Hours from now until the pickup calendar day (UTC date-only storage). */
export function hoursUntilStart(startDate: Date) {
  const startMs = dayStamp(new Date(startDate));
  return (startMs - Date.now()) / (1000 * 60 * 60);
}

export type CancelDecision = {
  allowed: boolean;
  freeCancel: boolean;
  hoursLeft: number;
  freeHoursRequired: number;
  refundNote: string;
};

export function evaluateCustomerCancel(startDate: Date): CancelDecision {
  const freeHoursRequired = cancelFreeHours();
  const hoursLeft = hoursUntilStart(startDate);
  const freeCancel = hoursLeft >= freeHoursRequired;
  const allowed = hoursLeft > 0;

  let refundNote: string;
  if (!allowed) {
    refundNote =
      "Rezervimi ka filluar ose ka mbaruar — anulimi nga klienti nuk lejohet.";
  } else if (freeCancel) {
    refundNote = `Anulim falas (≥ ${freeHoursRequired} orë para marrjes). Nëse ke paguar, pagesa kthehet sipas metodës së pagesës.`;
  } else {
    refundNote = `Anulim brenda ${freeHoursRequired} orëve para marrjes: pa rimbursim automatik. Kontakto AutoRent për raste speciale.`;
  }

  return {
    allowed,
    freeCancel,
    hoursLeft,
    freeHoursRequired,
    refundNote,
  };
}

export function assertCustomerCanCancel(
  startDate: Date,
  role: string
): CancelDecision {
  const decision = evaluateCustomerCancel(startDate);
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return { ...decision, allowed: true };
  }
  if (!decision.allowed) {
    throw new AppError(decision.refundNote, 400);
  }
  return decision;
}

export function cancellationPolicyText() {
  const h = cancelFreeHours();
  return [
    `Anulim falas deri ${h} orë para datës së marrjes.`,
    `Nën ${h} orë: anulimi pranohet, por pa rimbursim automatik.`,
    "Pas datës së fillimit: anulimi nga klienti nuk lejohet.",
    "Admin mund të ndryshojë statusin në raste të justifikuara.",
  ].join(" ");
}
