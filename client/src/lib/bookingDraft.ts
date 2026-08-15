export type BookingDraft = {
  carId: string;
  carSlug?: string | null;
  brand: string;
  model: string;
  imageUrl: string;
  type: string;
  transmission: string;
  pricePerDay: number;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  startDate: string;
  endDate: string;
  pickupLocationId: string;
  returnLocationId: string;
  pickupName: string;
  returnName: string;
  extras: string[];
  paymentMethod: string;
  carSubtotal: number;
  extrasTotal: number;
  locationFees: number;
  total: number;
  days: number;
  returnPath: string;
  notes?: string;
};

const KEY = "autorent-booking-draft";
const CONFIRMED_KEY = "autorent-booking-confirmed";

export type ConfirmedBooking = {
  reservationId: string;
  code: string;
  status: string;
  emailTo?: string | null;
  paymentMethod: string;
  paymentStatus?: string;
  totalPrice: number;
  startDate: string;
  endDate: string;
  pickupName: string;
  returnName: string;
  days: number;
  brand: string;
  model: string;
  imageUrl: string;
  type: string;
  transmission: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
};

export function saveBookingDraft(draft: BookingDraft) {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadBookingDraft(): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BookingDraft;
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  sessionStorage.removeItem(KEY);
}

export function saveConfirmedBooking(data: ConfirmedBooking) {
  sessionStorage.setItem(CONFIRMED_KEY, JSON.stringify(data));
}

export function loadConfirmedBooking(): ConfirmedBooking | null {
  try {
    const raw = sessionStorage.getItem(CONFIRMED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConfirmedBooking;
  } catch {
    return null;
  }
}

export function clearConfirmedBooking() {
  sessionStorage.removeItem(CONFIRMED_KEY);
}

export function formatReservationCode(id: string, createdAt?: string) {
  const year = new Date(createdAt || Date.now()).getFullYear();
  const short = id.replace(/-/g, "").slice(-5).toUpperCase();
  return `AR-${year}-${short}`;
}

export function formatShortDate(iso: string, locale = "en") {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "sq" ? "sq-AL" : locale === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "short",
  }).format(d);
}
