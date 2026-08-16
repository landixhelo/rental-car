import { SITE } from "../seo/site";

/** Two-line brand: Auto Rental + Via Egnatia */
export default function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <span className="brand-mark" aria-hidden>
        <svg viewBox="0 0 32 32" fill="none">
          <rect x="3" y="18" width="26" height="3" rx="1.2" fill="currentColor" />
          <rect x="5" y="23" width="22" height="1.6" rx="0.8" fill="currentColor" opacity="0.45" />
          <path
            d="M10 18V10.5c0-1.4.7-2.2 2.2-2.2h7.6c1.5 0 2.2.8 2.2 2.2V18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12.4 10.2h7.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="16" cy="13.4" r="1.35" fill="currentColor" />
        </svg>
      </span>
      <span className={`brand-lockup${compact ? " compact" : ""}`}>
        <span className="brand-text">{SITE.name}</span>
        <span className="brand-sub">{SITE.heritage}</span>
      </span>
    </>
  );
}
