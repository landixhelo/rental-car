// Production uses same-origin "/api" via Vercel rewrites so auth cookies work on mobile.
// Dev talks to local Express (or optional VITE_API_URL override).
const API_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL || "http://localhost:5000"
  : "";

export type BusinessHourRow = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: boolean;
  from?: string;
  to?: string;
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  businessPhone?: string | null;
  businessAddress?: string | null;
  bookingNotifyEmail?: string | null;
  avatarUrl?: string | null;
  notifyBookingEmail?: boolean;
  notifyCancelEmail?: boolean;
  notifyPaymentEmail?: boolean;
  notifyDocumentEmail?: boolean;
  minRentalDays?: number | null;
  maxRentalDays?: number | null;
  minDriverAge?: number | null;
  maxDriverAge?: number | null;
  weeklyDiscountPct?: number | null;
  monthlyDiscountPct?: number | null;
  requireDeposit?: boolean | null;
  defaultDepositEur?: number | null;
  businessHours?: BusinessHourRow[];
  businessHoursSummary?: string | null;
  cancellationPolicyText?: string | null;
  role: "USER" | "CONTRACTOR" | "ADMIN" | "SUPER_ADMIN";
  isActive?: boolean;
  createdAt?: string;
};

export type Account = User & {
  notes?: string | null;
  reservationsCount?: number;
  carsCount?: number;
  updatedAt?: string;
};

export type Car = {
  id: string;
  slug?: string | null;
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  seats: number;
  doors: number;
  luggage: number;
  horsepower?: string | null;
  color?: string | null;
  mileage?: string | null;
  location: string;
  fuel: string;
  transmission: string;
  type: string;
  status: "AVAILABLE" | "RESERVED" | "MAINTENANCE";
  description: string;
  features: string[];
  imageUrl: string;
  images?: string[];
  companyName?: string | null;
  shopSlug?: string | null;
  listingStatus?: string | null;
  reservedUntil?: string | null;
  busyRanges?: Array<{ startDate: string; endDate: string }>;
  ratingAvg?: number;
  ratingCount?: number;
  isFavorite?: boolean;
  reviews?: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    userName: string;
    createdAt: string;
  }>;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error("Nuk u lidh me serverin. Kontrollo internetin.");
  }

  const data = await res.json().catch(
    () => ({} as { message?: string; errors?: any })
  );
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error(
        "Fotot janë shumë të mëdha për upload. Provo foto më të vogla."
      );
    }
    if (
      res.status === 404 &&
      /passkeys/i.test(path) &&
      /route not found/i.test(String(data?.message || ""))
    ) {
      throw new Error(
        "Serveri po përditësohet. Rifresko faqen pas 1 minute dhe provo përsëri."
      );
    }
    const fieldMsg =
      data?.errors?.fieldErrors?.reason?.[0] ||
      data?.errors?.fieldErrors?.["body.reason"]?.[0] ||
      data?.errors?.formErrors?.[0];
    throw new Error(publicErrorMessage(fieldMsg || data.message, res.status));
  }
  return data as T;
}

/** Hide secrets / opaque "AI password" strings from toasts. */
function publicErrorMessage(raw: string | undefined, status: number): string {
  const msg = (raw || "").trim();
  if (!msg) return `Kërkesa dështoi (${status})`;
  if (
    /sk_live_|sk_test_|whsec_|postgres(ql)?:\/\//i.test(msg) ||
    /Invalid API Key|API key/i.test(msg) ||
    (/^[A-Za-z0-9#@$%!&*_.-]{10,64}$/.test(msg) && !/\s/.test(msg) && !/[àëç]/i.test(msg))
  ) {
    return "Ndodhi një gabim teknik. Provo Cash ose Transfer, pastaj rifresko faqen.";
  }
  return msg;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  meta: () =>
    request<{
      locations: Array<{ id: string; name: string; fee: number }>;
      extras: Array<{ id: string; name: string; price: number }>;
      cardEnabled?: boolean;
      business?: {
        phone?: string;
        phoneDigits?: string;
        email?: string;
        nipt?: string;
        address?: string;
        street?: string;
        hours?: string;
        cancelFreeHours?: number;
        cancellationPolicy?: string;
        mailConfigured?: boolean;
      };
    }>("/api/meta"),

  register: (body: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) =>
    request<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  forgotPassword: (email: string) =>
    request<{ message: string; resetUrl?: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  logout: () =>
    request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/api/auth/me"),
  updateProfile: (body: {
    fullName: string;
    phone?: string;
    password?: string;
    currentPassword?: string;
    avatarUrl?: string | null;
    companyName?: string | null;
    businessPhone?: string | null;
    businessAddress?: string | null;
    bookingNotifyEmail?: string | null;
    notifyBookingEmail?: boolean;
    notifyCancelEmail?: boolean;
    notifyPaymentEmail?: boolean;
    notifyDocumentEmail?: boolean;
    minRentalDays?: number | null;
    maxRentalDays?: number | null;
    minDriverAge?: number | null;
    maxDriverAge?: number | null;
    weeklyDiscountPct?: number | null;
    monthlyDiscountPct?: number | null;
    requireDeposit?: boolean | null;
    defaultDepositEur?: number | null;
    businessHours?: BusinessHourRow[] | null;
    cancellationPolicyText?: string | null;
  }) =>
    request<{ user: User }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("image", file);
    return request<{ url: string; user: User }>("/api/auth/avatar", {
      method: "POST",
      body: fd,
    });
  },
  passkeys: () =>
    request<{
      passkeys: Array<{ id: string; createdAt: string; transports: string[] }>;
    }>("/api/auth/passkeys"),
  passkeyRegisterOptions: () =>
    request<Record<string, unknown>>("/api/auth/passkeys/register/options", {
      method: "POST",
      body: "{}",
    }),
  passkeyRegisterVerify: (body: unknown) =>
    request<{
      verified: boolean;
      passkeys: Array<{ id: string; createdAt: string; transports: string[] }>;
    }>("/api/auth/passkeys/register/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  passkeyDelete: (id: string) =>
    request<{ ok: boolean }>(`/api/auth/passkeys/${id}`, { method: "DELETE" }),
  passkeyLoginOptions: (email?: string) =>
    request<Record<string, unknown>>("/api/auth/passkeys/login/options", {
      method: "POST",
      body: JSON.stringify({ email: email || undefined }),
    }),
  passkeyLoginVerify: (body: unknown) =>
    request<{ user: User }>("/api/auth/passkeys/login/verify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  notifications: () =>
    request<{
      notifications: Array<{
        id: string;
        title: string;
        message: string;
        read?: boolean;
        createdAt: string;
      }>;
    }>("/api/auth/notifications"),
  unreadReservationCount: () =>
    request<{ count: number }>("/api/auth/notifications/unread-count"),
  markReservationNotificationsRead: () =>
    request<{ ok: boolean }>("/api/auth/notifications/read", {
      method: "PATCH",
    }),
  pushVapidKey: () =>
    request<{ enabled: boolean; key: string | null }>(
      "/api/push/vapid-public-key"
    ),
  pushSubscribe: (body: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }) =>
    request<{ ok: boolean }>("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pushUnsubscribe: (endpoint: string) =>
    request<{ ok: boolean }>("/api/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    }),
  publicReviews: () =>
    request<{
      average: number;
      count: number;
      reviews: Array<{
        id: string;
        rating: number;
        comment: string | null;
        userName: string;
        carLabel: string;
        createdAt: string;
      }>;
    }>("/api/reviews"),

  cars: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<{ cars: Car[] }>(`/api/cars${q ? `?${q}` : ""}`);
  },
  dashboard: () =>
    request<{
      scope: "fleet" | "platform";
      fleet: {
        total: number;
        available: number;
        reserved: number;
        maintenance: number;
        availabilityPct: number;
      };
      reservations: {
        total: number;
        byStatus: Record<string, number>;
        active: number;
      };
      revenue: {
        total: number;
        monthly: Array<{ month: string; total: number }>;
      };
      ops: {
        pendingDocuments: number;
        heldDeposits: number;
      };
      recent: Array<{
        id: string;
        status: string;
        totalPrice: number;
        startDate: string;
        endDate: string;
        carLabel: string;
        customerName: string;
        customerEmail: string;
        createdAt: string;
      }>;
      topCars: Array<{
        carId: string;
        label: string;
        count: number;
        revenue?: number;
        imageUrl?: string | null;
      }>;
    }>("/api/dashboard"),
  dashboardCustomers: () =>
    request<{
      customers: Array<{
        id: string;
        fullName: string;
        email: string;
        phone: string | null;
        memberSince: string;
        bookings: number;
        revenue: number;
        lastBookingId: string;
        lastCar: string;
        lastStart: string;
        lastEnd: string;
        lastStatus: string;
      }>;
    }>("/api/dashboard/customers"),
  dashboardReviews: () =>
    request<{
      reviews: Array<{
        id: string;
        rating: number;
        comment: string | null;
        createdAt: string;
        userName: string;
        userEmail: string;
        carId: string;
        carLabel: string;
        carYear: number;
        carImage: string;
      }>;
      average: number;
    }>("/api/dashboard/reviews"),
  dashboardLocations: () =>
    request<{
      locations: Array<{
        id: string;
        name: string;
        fee: number;
        pickups: number;
        returns: number;
        revenue: number;
      }>;
    }>("/api/dashboard/locations"),
  myCars: () => request<{ cars: Car[] }>("/api/cars/mine"),
  car: (id: string) => request<{ car: Car }>(`/api/cars/${id}`),
  uploadCarImage: (body: FormData) =>
    request<{ url: string }>("/api/cars/images", {
      method: "POST",
      body,
    }),
  createCar: (body: FormData | Record<string, unknown>) =>
    request<{ car: Car }>("/api/cars", {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  updateCar: (id: string, body: FormData | Record<string, unknown>) =>
    request<{ car: Car }>(`/api/cars/${id}`, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  deleteCar: (id: string) =>
    request<{ message: string }>(`/api/cars/${id}`, { method: "DELETE" }),

  createReservation: (formData: FormData) =>
    request<{
      reservation: unknown;
      checkoutUrl?: string | null;
      emailQueued?: boolean;
      emailSent?: boolean;
      emailTo?: string | null;
    }>("/api/reservations", {
      method: "POST",
      body: formData,
    }),
  myReservations: () =>
    request<{ reservations: any[] }>("/api/reservations/mine"),
  fleetReservations: () =>
    request<{ reservations: any[] }>("/api/reservations/fleet"),
  getReservation: (id: string) =>
    request<{ reservation: any }>(`/api/reservations/${id}`),
  allReservations: () =>
    request<{ reservations: any[] }>("/api/reservations"),
  cancelReservation: (id: string, reason: string) =>
    request<{
      reservation: unknown;
      cancellation?: {
        freeCancel: boolean;
        refundNote: string;
        reason?: string;
      };
    }>(`/api/reservations/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  updateReservationStatus: (id: string, status: string) =>
    request<{ reservation: unknown }>(`/api/reservations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateReservationPayment: (id: string, paymentStatus: string) =>
    request<{ reservation: unknown }>(`/api/reservations/${id}/payment`, {
      method: "PATCH",
      body: JSON.stringify({ paymentStatus }),
    }),
  updateReservationDocument: (
    id: string,
    body: { documentStatus: string; documentNote?: string }
  ) =>
    request<{ reservation: unknown }>(`/api/reservations/${id}/document`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateReservationDeposit: (
    id: string,
    body: { depositStatus: string; depositAmount?: number }
  ) =>
    request<{ reservation: unknown }>(`/api/reservations/${id}/deposit`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  reservationContractUrl: (id: string) =>
    `${API_URL}/api/reservations/${id}/contract.pdf`,
  deleteReservation: (id: string) =>
    request<{ message: string }>(`/api/reservations/${id}`, {
      method: "DELETE",
    }),

  addReview: (body: { carId: string; rating: number; comment?: string }) =>
    request<{ review: unknown }>("/api/reviews", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  favorites: () => request<{ favorites: Array<{ id: string; car: Car }> }>("/api/favorites"),
  addFavorite: (carId: string) =>
    request("/api/favorites", {
      method: "POST",
      body: JSON.stringify({ carId }),
    }),
  removeFavorite: (carId: string) =>
    request(`/api/favorites/${carId}`, { method: "DELETE" }),

  contact: (body: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) =>
    request("/api/contact", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  chats: () =>
    request<{ messages: any[]; unread: number }>("/api/chats"),
  updateChatStatus: (id: string, status: "New" | "Read" | "Done") =>
    request<{ message: any }>(`/api/chats/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  adminStats: () => request<{ stats: any }>("/api/admin/stats"),
  adminMessages: () => request<{ messages: any[] }>("/api/admin/messages"),
  adminUsers: () => request<{ users: User[] }>("/api/admin/users"),
  deleteUser: (id: string) =>
    request(`/api/admin/users/${id}`, { method: "DELETE" }),

  superOverview: () =>
    request<{ overview: Record<string, number> }>("/api/super-admin/overview"),
  superAccounts: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<{ accounts: Account[] }>(
      `/api/super-admin/accounts${q ? `?${q}` : ""}`
    );
  },
  superAccount: (id: string) =>
    request<{ account: Account; reservations: any[]; cars: Car[] }>(
      `/api/super-admin/accounts/${id}`
    ),
  createAccount: (body: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    companyName?: string;
    role: "USER" | "CONTRACTOR" | "ADMIN";
    notes?: string;
  }) =>
    request<{ account: Account }>("/api/super-admin/accounts", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAccount: (
    id: string,
    body: Partial<{
      fullName: string;
      phone: string | null;
      companyName: string | null;
      role: "USER" | "CONTRACTOR" | "ADMIN";
      isActive: boolean;
      notes: string | null;
      password: string;
    }>
  ) =>
    request<{ account: Account }>(`/api/super-admin/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  toggleAccountActive: (id: string) =>
    request<{ account: Account }>(
      `/api/super-admin/accounts/${id}/toggle-active`,
      { method: "PATCH" }
    ),
  deleteAccount: (id: string) =>
    request<{ message: string }>(`/api/super-admin/accounts/${id}`, {
      method: "DELETE",
    }),
  notifyAccount: (id: string, body: { title: string; message: string }) =>
    request(`/api/super-admin/accounts/${id}/notify`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  marketplaceShops: () =>
    request<{ shops: MarketplaceShop[] }>("/api/marketplace/shops"),
  marketplaceShop: (slug: string) =>
    request<{ shop: MarketplaceShop; cars: Car[] }>(
      `/api/marketplace/shops/${encodeURIComponent(slug)}`
    ),
  marketplaceSales: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<{ listings: SaleListing[] }>(
      `/api/marketplace/sales${q ? `?${q}` : ""}`
    );
  },
  marketplaceSale: (id: string) =>
    request<{ listing: SaleListing }>(`/api/marketplace/sales/${id}`),
  myShop: () => request<{ shop: MyShop }>("/api/marketplace/my-shop"),
  updateMyShop: (body: Partial<MyShop> & { companyName?: string }) =>
    request<{ shop: MyShop }>("/api/marketplace/my-shop", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  mySales: () =>
    request<{ listings: SaleListing[] }>("/api/marketplace/my-sales"),
  createSale: (body: Record<string, unknown>) =>
    request<{ listing: SaleListing }>("/api/marketplace/my-sales", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateSale: (id: string, body: Record<string, unknown>) =>
    request<{ listing: SaleListing }>(`/api/marketplace/my-sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteSale: (id: string) =>
    request<{ message: string }>(`/api/marketplace/my-sales/${id}`, {
      method: "DELETE",
    }),
  adminMarketplaceSales: () =>
    request<{ listings: SaleListing[] }>("/api/marketplace/admin/sales"),
  adminUpdateSaleStatus: (
    id: string,
    status: SaleListing["status"]
  ) =>
    request<{ listing: SaleListing }>(`/api/marketplace/admin/sales/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

export type MarketplaceShop = {
  slug: string;
  name: string;
  bio?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  phone?: string | null;
  carsCount?: number;
};

export type MyShop = {
  companyName?: string | null;
  shopSlug?: string | null;
  shopBio?: string | null;
  shopLogoUrl?: string | null;
  shopCity?: string | null;
  shopIsPublic?: boolean;
  commissionPercent?: number | null;
  phone?: string | null;
};

export type SaleListing = {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage?: string | null;
  location: string;
  fuel?: string | null;
  transmission?: string | null;
  type?: string | null;
  color?: string | null;
  description: string;
  images: string[];
  imageUrl?: string;
  status: string;
  createdAt?: string;
  seller?: {
    name: string;
    phone?: string | null;
    shopSlug?: string | null;
  } | null;
};

export { API_URL };
