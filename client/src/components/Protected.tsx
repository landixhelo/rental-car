import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useT } from "../context/LocaleContext";

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
  const t = useT();
  if (loading) return <div className="page">{t("common.loading")}</div>;
  if (!user) return <Navigate to="/login" replace />;
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
