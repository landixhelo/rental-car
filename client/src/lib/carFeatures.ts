/** Shared car feature checklist for Admin / Contractor forms (Albanian UI). */
export const CAR_FEATURE_OPTIONS = [
  "Klimë automatike",
  "Ajër i kondicionuar",
  "Navigacion GPS",
  "Bluetooth",
  "Apple CarPlay",
  "Android Auto",
  "Kamera parkimi",
  "Sensorë parkimi",
  "Ndihmës parkimi",
  "Sensor këndi i verbër",
  "Ngrohje sediljesh",
  "Sedilje lëkure",
  "Kontroll cruise",
  "Hyrje pa çelës",
  "Drita LED",
  "Sensor shiu",
  "Start/Stop",
  "ISOFIX",
  "Çati panoramike",
  "4x4",
  "Virtual Cockpit",
  "Sistem audio Bose",
] as const;

export function mergeFeatureOptions(selected: string[]): string[] {
  const extras = selected.filter(
    (f) => !(CAR_FEATURE_OPTIONS as readonly string[]).includes(f)
  );
  return [...CAR_FEATURE_OPTIONS, ...extras];
}
