type OwnerInfo = {
  companyName: string | null;
  fullName: string;
  shopSlug?: string | null;
  shopIsPublic?: boolean | null;
} | null;

export const carOwnerSelect = {
  select: {
    companyName: true,
    fullName: true,
    shopSlug: true,
    shopIsPublic: true,
  },
} as const;

export function companyNameFromOwner(owner: OwnerInfo): string {
  if (!owner) return "Auto Rental";
  const company = owner.companyName?.trim();
  // Prefer company brand; do not fall back to a person's name (looks like wrong booker).
  return company || "Auto Rental";
}

export function shopSlugFromOwner(owner: OwnerInfo): string | null {
  if (!owner?.shopIsPublic || !owner.shopSlug) return null;
  return owner.shopSlug;
}
