type OwnerInfo = {
  companyName: string | null;
  fullName: string;
} | null;

export const carOwnerSelect = {
  select: {
    companyName: true,
    fullName: true,
  },
} as const;

export function companyNameFromOwner(owner: OwnerInfo): string {
  if (!owner) return "AutoRent";
  const company = owner.companyName?.trim();
  // Prefer company brand; do not fall back to a person's name (looks like wrong booker).
  return company || "AutoRent";
}
