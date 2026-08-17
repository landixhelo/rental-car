export function isPlaceholderGuestEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().endsWith("@guest.viaegnatia.al"));
}
