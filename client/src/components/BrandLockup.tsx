import { SITE } from "../seo/site";

const LOGO_SRC = "/logo.png";

/** Official mark: Auto Rental — Via Egnatia (milestone) */
export default function BrandLockup({
  size = "nav",
}: {
  size?: "nav" | "footer" | "ops";
}) {
  return (
    <img
      src={LOGO_SRC}
      alt={SITE.fullName}
      className={`brand-logo brand-logo--${size}`}
    />
  );
}
