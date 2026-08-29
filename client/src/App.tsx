import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LocaleProvider } from "./context/LocaleContext";
import { ToastProvider } from "./context/ToastContext";
import { UnreadProvider } from "./context/UnreadContext";
import Layout from "./components/Layout";
import OpsLayout from "./components/OpsLayout";
import CheckoutDetailsPage from "./pages/CheckoutDetailsPage";
import CheckoutConfirmedPage from "./pages/CheckoutConfirmedPage";
import { Protected } from "./components/Protected";
import LocationPage from "./pages/LocationPage";
import HomePage from "./pages/HomePage";
import CarsPage from "./pages/CarsPage";
import CarDetailsPage from "./pages/CarDetailsPage";
import OpsLoginPage from "./pages/OpsLoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ReservationsPage from "./pages/ReservationsPage";
import ReservationDetailPage from "./pages/ReservationDetailPage";
import FavoritesPage from "./pages/FavoritesPage";
import ProfilePage from "./pages/ProfilePage";
import ContactPage from "./pages/ContactPage";
import FaqPage from "./pages/FaqPage";
import TermsPage from "./pages/TermsPage";
import AdminPage from "./pages/AdminPage";
import SuperAdminPage from "./pages/SuperAdminPage";
import ContractorPage from "./pages/ContractorPage";
import CalendarPage from "./pages/CalendarPage";
import DashboardPage from "./pages/DashboardPage";
import ChatsPage from "./pages/ChatsPage";
import CustomersPage from "./pages/CustomersPage";
import CustomerHistoryPage from "./pages/CustomerHistoryPage";
import LocationsPage from "./pages/LocationsPage";
import ReviewsPage from "./pages/ReviewsPage";
import PromoCodesPage from "./pages/PromoCodesPage";
import ReportsPage from "./pages/ReportsPage";
import Analytics from "./components/Analytics";
import CookieConsent from "./components/CookieConsent";
import PwaInstall from "./components/PwaInstall";
import { StaffPushBanner } from "./components/StaffPush";

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <UnreadProvider>
          <BrowserRouter>
            <ToastProvider>
              <Analytics />
              <CookieConsent />
              <PwaInstall />
              <StaffPushBanner />
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="cars" element={<CarsPage />} />
                  <Route path="cars/:id" element={<CarDetailsPage />} />
                  <Route path="checkout" element={<CheckoutDetailsPage />} />
                  <Route
                    path="checkout/confirmed"
                    element={<CheckoutConfirmedPage />}
                  />
                  <Route
                    path="marketplace"
                    element={<Navigate to="/cars" replace />}
                  />
                  <Route
                    path="marketplace/*"
                    element={<Navigate to="/cars" replace />}
                  />
                  <Route
                    path="shops/:slug"
                    element={<Navigate to="/cars" replace />}
                  />
                  <Route path="seller" element={<Navigate to="/" replace />} />
                  <Route path="login" element={<Navigate to="/ops" replace />} />
                  <Route path="ops" element={<OpsLoginPage />} />
                  <Route
                    path="new-admin"
                    element={<Navigate to="/ops" replace />}
                  />
                  <Route path="register" element={<Navigate to="/" replace />} />
                  <Route
                    path="forgot-password"
                    element={<ForgotPasswordPage />}
                  />
                  <Route
                    path="reset-password"
                    element={<ResetPasswordPage />}
                  />
                  <Route path="contact" element={<ContactPage />} />
                  <Route path="faq" element={<FaqPage />} />
                  <Route path="terms" element={<TermsPage />} />
                  <Route
                    path="car-rental-:city"
                    element={<LocationPage />}
                  />

                  <Route element={<OpsLayout />}>
                    <Route
                      path="reservations"
                      element={
                        <Protected>
                          <ReservationsPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="reservations/:id"
                      element={
                        <Protected>
                          <ReservationDetailPage />
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
                      path="calendar"
                      element={
                        <Protected contractor>
                          <CalendarPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="costumers"
                      element={<Navigate to="/customers" replace />}
                    />
                    <Route
                      path="customers"
                      element={
                        <Protected contractor>
                          <CustomersPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="customers/:id"
                      element={
                        <Protected contractor>
                          <CustomerHistoryPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="locations"
                      element={
                        <Protected contractor>
                          <LocationsPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="reviews"
                      element={
                        <Protected contractor>
                          <ReviewsPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="promo-codes"
                      element={
                        <Protected contractor>
                          <PromoCodesPage />
                        </Protected>
                      }
                    />
                    <Route
                      path="reports"
                      element={
                        <Protected contractor>
                          <ReportsPage />
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
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </ToastProvider>
          </BrowserRouter>
          </UnreadProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
