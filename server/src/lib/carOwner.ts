type OwnerInfo = {
  companyName: string | null;
  fullName: string;
  shopSlug?: string | null;
  shopIsPublic?: boolean | null;
  minRentalDays?: number | null;
  maxRentalDays?: number | null;
} | null;

export const carOwnerSelect = {
  select: {
    companyName: true,
    fullName: true,
    shopSlug: true,
    shopIsPublic: true,
    minRentalDays: true,
    maxRentalDays: true,
  },
} as const;

export function rentalRulesFromOwner(owner: OwnerInfo) {
  const min = owner?.minRentalDays;
  const max = owner?.maxRentalDays;
  return {
    minRentalDays: typeof min === "number" && min >= 1 ? min : 1,
    maxRentalDays: typeof max === "number" && max >= 1 ? max : 365,
  };
}

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
