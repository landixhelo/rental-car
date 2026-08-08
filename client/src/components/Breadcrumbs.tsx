import { Link } from "react-router-dom";
import { useT } from "../context/LocaleContext";

export type Crumb = {
  label: string;
  to?: string;
};

function HomeIcon() {
  return (
    <svg
      className="breadcrumbs-home-icon"
      viewBox="0 0 20 20"
      width="15"
      height="15"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M10.7 2.2a1 1 0 0 0-1.4 0l-7 7A1 1 0 0 0 3 10.8V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-3h2v3a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-6.2a1 1 0 0 0 .7-1.6l-7-7Z"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="breadcrumbs-chevron"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3.5 10.5 8 6 12.5"
      />
    </svg>
  );
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useT();
  const crumbs: Crumb[] = [{ label: t("nav.home"), to: "/" }, ...items];

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          const isHome = i === 0;
          return (
            <li key={`${crumb.label}-${i}`} className="breadcrumbs-item">
              {i > 0 ? (
                <span className="breadcrumbs-sep" aria-hidden>
                  <ChevronIcon />
                </span>
              ) : null}
              {last || !crumb.to ? (
                <span className="breadcrumbs-current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className={`breadcrumbs-link${isHome ? " is-home" : ""}`}
                >
                  {isHome ? <HomeIcon /> : null}
                  <span>{crumb.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
