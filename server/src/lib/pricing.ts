export const LOCATIONS = [
  { id: "tirane", name: "Tiranë - Qendra", fee: 0 },
  { id: "airport", name: "Aeroporti Rinas", fee: 15 },
  { id: "durres", name: "Durrës", fee: 20 },
  { id: "vlore", name: "Vlorë", fee: 35 },
] as const;

export const EXTRAS = [
  { id: "gps", name: "GPS", price: 5 },
  { id: "childSeat", name: "Sedilje fëmijësh", price: 7 },
  { id: "driver", name: "Shofer", price: 40 },
  { id: "insurance", name: "Sigurim ekstra", price: 12 },
] as const;

export function getLocation(id: string) {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}

export function calcDays(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
