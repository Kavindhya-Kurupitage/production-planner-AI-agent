import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Breadcrumbs } from "./components/layout/Breadcrumbs";
import { BottomNav } from "./components/layout/BottomNav";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { useCompaniesQuery } from "./hooks/useCompany";
import { CompanyListPage } from "./pages/company/CompanyListPage";
import { CompanyDetailPage } from "./pages/company/CompanyDetailPage";
import { CompanySetupPage } from "./pages/company/CompanySetupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { BenchmarkPage } from "./pages/benchmark/BenchmarkPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ScenarioPage } from "./pages/scenario/ScenarioPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { ScenarioHistoryPage } from "./pages/scenario/ScenarioHistoryPage";
import { LoadingPage } from "./pages/system/LoadingPage";
import { NotFoundPage } from "./pages/system/NotFoundPage";
import { useAuth } from "./hooks/useAuth";
import { useAuthStore } from "./store/authStore";

/** `/benchmark` without company id — redirect to first workspace or company list */
function BenchmarkLegacyRedirect() {
  const { data, isLoading } = useCompaniesQuery();
  if (isLoading) return <LoadingPage />;
  const id = data?.[0]?.id;
  if (!id) return <Navigate to="/companies" replace />;
  return <Navigate to={`/companies/${id}/benchmark`} replace />;
}

export default function App() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const { logout } = useAuth();
  const userName = user?.full_name ?? "User";

  if (!hasHydrated) {
    return <LoadingPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="min-h-screen bg-[#0a0a0a] text-white">
              <div className="pointer-events-none fixed inset-0 z-0 opacity-60 [background:radial-gradient(circle_at_20%_-10%,rgba(245,197,24,0.06),transparent_35%),radial-gradient(circle_at_100%_0%,rgba(245,197,24,0.04),transparent_30%)]" />
              <div className="flex">
                <Sidebar onLogout={logout} />
                <div className="relative z-0 ml-0 flex min-h-screen flex-1 flex-col">
                  <TopBar userName={userName} />
                  <Breadcrumbs />
                  <main className="page-transition flex-1 pb-0 md:pb-4">
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/benchmark" element={<BenchmarkLegacyRedirect />} />
                      <Route path="/companies" element={<CompanyListPage />} />
                      <Route path="/companies/new" element={<CompanySetupPage />} />
                      <Route path="/companies/:id" element={<CompanyDetailPage />} />
                      <Route path="/companies/:id/scenario" element={<ScenarioPage />} />
                      <Route path="/companies/:id/benchmark" element={<BenchmarkPage />} />
                      <Route path="/companies/:id/history" element={<ScenarioHistoryPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </main>
                  <BottomNav />
                </div>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
