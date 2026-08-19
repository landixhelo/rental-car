import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";
import { isStaffOnlyPath } from "./OpsLayout";

export function Protected({
  children,
  admin,
  superAdmin,
  contractor,
}: {
  children: React.ReactNode;
  admin?: boolean;
  superAdmin?: boolean;
  contractor?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const t = useT();
  if (loading) return <div className="page">{t("common.loading")}</div>;
  if (!user) {
    const next = `${location.pathname}${location.search}`;
    const gate = isStaffOnlyPath(location.pathname) ? "/ops" : "/login";
    return (
      <Navigate
        to={`${gate}?next=${encodeURIComponent(next)}`}
        replace
      />
    );
  }
  if (superAdmin && user.role !== "SUPER_ADMIN") {
    return <Navigate to="/" replace />;
  }
  if (admin && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return <Navigate to="/" replace />;
  }
  if (
    contractor &&
    user.role !== "CONTRACTOR" &&
    user.role !== "ADMIN" &&
    user.role !== "SUPER_ADMIN"
  ) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
