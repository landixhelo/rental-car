/** Public car detail path — uses slug when present (e.g. /cars/bmw-x5-2023). */
export function carPath(car: { id: string; slug?: string | null }) {
  const key = (car.slug || "").trim() || car.id;
  return `/cars/${key}`;
}
