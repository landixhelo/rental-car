import { prisma } from "./prisma.js";

/** Build URL-safe slug; keeps Albanian letters readable (ë→e, ç→c). */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ë]/g, "e")
    .replace(/[ç]/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

export function carSlugBase(brand: string, model: string, year: number | string) {
  const base = slugify(`${brand} ${model} ${year}`);
  return base || "makina";
}

/** Unique public shop slug for a contractor. */
export async function uniqueShopSlug(
  name: string,
  excludeUserId?: string
): Promise<string> {
  const base = slugify(name) || "shop";
  let candidate = base;
  let n = 2;
  for (;;) {
    const existing = await prisma.user.findFirst({
      where: {
        shopSlug: candidate,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 50) return `${base}-${Date.now().toString(36)}`;
  }
}

/** Unique slug for create/update; excludes `excludeId` when updating. */
export async function uniqueCarSlug(
  brand: string,
  model: string,
  year: number | string,
  excludeId?: string
): Promise<string> {
  const base = carSlugBase(brand, model, year);
  let candidate = base;
  let n = 2;

  for (;;) {
    const existing = await prisma.car.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 50) {
      return `${base}-${Date.now().toString(36)}`;
    }
  }
}
