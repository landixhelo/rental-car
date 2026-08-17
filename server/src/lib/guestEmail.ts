export const GUEST_EMAIL_DOMAIN = "guest.viaegnatia.al";

export function isPlaceholderGuestEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().endsWith(`@${GUEST_EMAIL_DOMAIN}`));
}
