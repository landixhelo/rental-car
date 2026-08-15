import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import CheckoutDetailsPage from "./pages/CheckoutDetailsPage";
import CheckoutConfirmedPage from "./pages/CheckoutConfirmedPage";
import { Protected } from "./components/Protected";
import HomePage from "./pages/HomePage";
import CarsPage from "./pages/CarsPage";
import CarDetailsPage from "./pages/CarDetailsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ReservationsPage from "./pages/ReservationsPage";
import FavoritesPage from "./pages/FavoritesPage";
import ProfilePage from "./pages/ProfilePage";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import TermsPage from "./pages/TermsPage";
import AdminPage from "./pages/AdminPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import ContractorPage from "./pages/ContractorPage";
import DashboardPage from "./pages/DashboardPage";
import ChatsPage from "./pages/ChatsPage";
import Analytics from "./components/Analytics";
import CookieConsent from "./components/CookieConsent";

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <BrowserRouter>
            <ToastProvider>
            <Analytics />
            <CookieConsent />
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="cars" element={<CarsPage />} />
                <Route path="cars/:id" element={<CarDetailsPage />} />
                <Route
                  path="checkout"
                  element={
                    <Protected>
                      <CheckoutDetailsPage />
                    </Protected>
                  }
                />
                <Route
                  path="checkout/confirmed"
                  element={
                    <Protected>
                      <CheckoutConfirmedPage />
                    </Protected>
                  }
                />
                {/* Market/sale temporarily disabled — redirect to rental */}
                <Route path="marketplace" element={<Navigate to="/cars" replace />} />
                <Route path="marketplace/*" element={<Navigate to="/cars" replace />} />
                <Route path="shops/:slug" element={<Navigate to="/cars" replace />} />
                <Route path="seller" element={<Navigate to="/" replace />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="faq" element={<FaqPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route
                  path="reservations"
                  element={
                    <Protected>
                      <ReservationsPage />
                    </Protected>
                  }
                />
                <Route
                  path="favorites"
                  element={
                    <Protected>
                      <FavoritesPage />
                    </Protected>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <Protected>
                      <ProfilePage />
                    </Protected>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <Protected contractor>
                      <DashboardPage />
                    </Protected>
                  }
                />
                <Route
                  path="chats"
                  element={
                    <Protected contractor>
                      <ChatsPage />
                    </Protected>
                  }
                />
                <Route
                  path="contractor"
                  element={
                    <Protected contractor>
                      <ContractorPage />
                    </Protected>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <Protected admin>
                      <AdminPage />
                    </Protected>
                  }
                />
                <Route
                  path="super-admin"
                  element={
                    <Protected superAdmin>
                      <SuperAdminPage />
                    </Protected>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            </ToastProvider>
          </BrowserRouter>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
