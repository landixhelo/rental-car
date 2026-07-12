// Production uses same-origin "/api" via Vercel rewrites so auth cookies work on mobile.
// Dev talks to local Express (or optional VITE_API_URL override).
const API_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL || "http://localhost:5000"
  : "";

export type User = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
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
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data as T;
}

export const api = {
  health: () => request<{ ok: boolean }>("/api/health"),
  meta: () =>
    request<{
      locations: Array<{ id: string; name: string; fee: number }>;
      extras: Array<{ id: string; name: string; price: number }>;
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
  login: (body: { email: string; password: string }) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () =>
    request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/api/auth/me"),
  updateProfile: (body: {
    fullName: string;
    phone?: string;
    password?: string;
  }) =>
    request<{ user: User }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  notifications: () =>
    request<{
      notifications: Array<{
        id: string;
        title: string;
        message: string;
        createdAt: string;
      }>;
    }>("/api/auth/notifications"),

  cars: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params || {}).toString();
    return request<{ cars: Car[] }>(`/api/cars${q ? `?${q}` : ""}`);
  },
  car: (id: string) => request<{ car: Car }>(`/api/cars/${id}`),
  createCar: (body: Partial<Car>) =>
    request<{ car: Car }>("/api/cars", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCar: (id: string, body: Partial<Car>) =>
    request<{ car: Car }>(`/api/cars/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteCar: (id: string) =>
    request<{ message: string }>(`/api/cars/${id}`, { method: "DELETE" }),

  createReservation: (formData: FormData) =>
    request<{ reservation: unknown }>("/api/reservations", {
      method: "POST",
      body: formData,
    }),
  myReservations: () =>
    request<{ reservations: any[] }>("/api/reservations/mine"),
  allReservations: () =>
    request<{ reservations: any[] }>("/api/reservations"),
  cancelReservation: (id: string) =>
    request<{ reservation: unknown }>(`/api/reservations/${id}/cancel`, {
      method: "PATCH",
    }),
  updateReservationStatus: (id: string, status: string) =>
    request<{ reservation: unknown }>(`/api/reservations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
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
};

export { API_URL };
