/** Shared car feature checklist for Admin / Contractor forms. */
export const CAR_FEATURE_OPTIONS = [
  "Klimë automatike",
  "AC",
  "Navigacion GPS",
  "Bluetooth",
  "Apple CarPlay",
  "Android Auto",
  "Kamera parkimi",
  "Sensorë parkimi",
  "Park Assist",
  "Blindspot",
  "Ngrohje sediljesh",
  "Sedilje lëkure",
  "Cruise control",
  "Keyless entry",
  "LED lights",
  "Sensor shiu",
  "Start/Stop",
  "ISOFIX",
  "Panoramic roof",
  "4x4",
  "Virtual Cockpit",
  "Sound System Bose",
] as const;

export function mergeFeatureOptions(selected: string[]): string[] {
  const extras = selected.filter(
    (f) => !(CAR_FEATURE_OPTIONS as readonly string[]).includes(f)
  );
  return [...CAR_FEATURE_OPTIONS, ...extras];
}
