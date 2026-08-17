import { Link } from "react-router-dom";
import { useT } from "../context/LocaleContext";

export type Crumb = {
  label: string;
  to?: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useT();
  const crumbs: Crumb[] = [{ label: t("details.crumbHome"), to: "/" }, ...items];

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="breadcrumbs-item">
              {i > 0 ? (
                <span className="breadcrumbs-sep" aria-hidden>
                  ›
                </span>
              ) : null}
              {last || !crumb.to ? (
                <span className="breadcrumbs-current" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to} className="breadcrumbs-link">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
