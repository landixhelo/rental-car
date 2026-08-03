/** Public car URL — prefers readable slug over cuid. */
export function carPath(car: { id: string; slug?: string | null }) {
  return `/cars/${car.slug || car.id}`;
}
