/** Translate stored enum/code values; falls back to raw value if key missing. */
export function enumLabel(
  t: (key: string) => string,
  prefix: string,
  value: string | null | undefined
): string {
  if (!value) return "-";
  const key = `${prefix}.${value}`;
  const out = t(key);
  return out === key ? value : out;
}

export function fuelLabel(t: (key: string) => string, value?: string | null) {
  return enumLabel(t, "labels.fuel", value);
}

export function transmissionLabel(
  t: (key: string) => string,
  value?: string | null
) {
  return enumLabel(t, "labels.transmission", value);
}

export function carTypeLabel(t: (key: string) => string, value?: string | null) {
  return enumLabel(t, "labels.type", value);
}

export function paymentLabel(t: (key: string) => string, value?: string | null) {
  return enumLabel(t, "labels.payment", value);
}

export function roleLabel(t: (key: string) => string, value?: string | null) {
  return enumLabel(t, "roles", value);
}

export function statusLabel(t: (key: string) => string, value?: string | null) {
  return enumLabel(t, "status", value);
}
