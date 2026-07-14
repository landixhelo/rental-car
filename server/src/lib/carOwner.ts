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
  return company || owner.fullName;
}
