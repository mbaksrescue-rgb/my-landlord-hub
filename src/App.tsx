import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { FullPageLoader } from "@/components/ui/loading-spinner";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

// Pages
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import ChangePassword from "@/pages/ChangePassword";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import Properties from "@/pages/admin/Properties";
import Units from "@/pages/admin/Units";
import Tenants from "@/pages/admin/Tenants";
import Leases from "@/pages/admin/Leases";
import AdminPayments from "@/pages/admin/Payments";
import AdminMaintenance from "@/pages/admin/Maintenance";
import Reports from "@/pages/admin/Reports";
import ActivityLogs from "@/pages/admin/ActivityLogs";
import Settings from "@/pages/admin/Settings";

// Tenant Pages
import TenantDashboard from "@/pages/tenant/Dashboard";
import TenantPayments from "@/pages/tenant/Payments";
import TenantLease from "@/pages/tenant/Lease";
import TenantMaintenance from "@/pages/tenant/Maintenance";

// Caretaker Pages
import CaretakerDashboard from "@/pages/caretaker/Dashboard";
import CaretakerTenants from "@/pages/caretaker/Tenants";
import TenantAssist from "@/pages/caretaker/TenantAssist";
import CaretakerMaintenance from "@/pages/caretaker/Maintenance";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: ('admin' | 'tenant' | 'caretaker')[] }) {
  const { user, role, loading, mustChangePassword } = useAuth();
  
  // Enable session timeout for protected routes
  useSessionTimeout({ enabled: true });

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Force password change if required
  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'caretaker') return <Navigate to="/caretaker" replace />;
    return <Navigate to="/tenant" replace />;
  }

  return <>{children}</>;
}

// Auth Route - redirects authenticated users to their dashboard
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading, mustChangePassword } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (user) {
    if (mustChangePassword) {
      return <Navigate to="/change-password" replace />;
    }
    if (role) {
      return <Navigate to={role === 'admin' ? '/admin' : role === 'caretaker' ? '/caretaker' : '/tenant'} replace />;
    }
  }

  return <>{children}</>;
}

// Root redirect based on role
function RootRedirect() {
  const { user, role, loading, mustChangePassword } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'caretaker') return <Navigate to="/caretaker" replace />;
  return <Navigate to="/tenant" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />
      
      {/* Auth */}
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/properties" element={<ProtectedRoute allowedRoles={['admin']}><Properties /></ProtectedRoute>} />
      <Route path="/admin/units" element={<ProtectedRoute allowedRoles={['admin']}><Units /></ProtectedRoute>} />
      <Route path="/admin/tenants" element={<ProtectedRoute allowedRoles={['admin']}><Tenants /></ProtectedRoute>} />
      <Route path="/admin/leases" element={<ProtectedRoute allowedRoles={['admin']}><Leases /></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayments /></ProtectedRoute>} />
      <Route path="/admin/maintenance" element={<ProtectedRoute allowedRoles={['admin']}><AdminMaintenance /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
      <Route path="/admin/activity" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLogs /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />

      {/* Tenant Routes */}
      <Route path="/tenant" element={<ProtectedRoute allowedRoles={['tenant']}><TenantDashboard /></ProtectedRoute>} />
      <Route path="/tenant/payments" element={<ProtectedRoute allowedRoles={['tenant']}><TenantPayments /></ProtectedRoute>} />
      <Route path="/tenant/lease" element={<ProtectedRoute allowedRoles={['tenant']}><TenantLease /></ProtectedRoute>} />
      <Route path="/tenant/maintenance" element={<ProtectedRoute allowedRoles={['tenant']}><TenantMaintenance /></ProtectedRoute>} />

      {/* Caretaker Routes */}
      <Route path="/caretaker" element={<ProtectedRoute allowedRoles={['caretaker']}><CaretakerDashboard /></ProtectedRoute>} />
      <Route path="/caretaker/tenants" element={<ProtectedRoute allowedRoles={['caretaker']}><CaretakerTenants /></ProtectedRoute>} />
      <Route path="/caretaker/assist" element={<ProtectedRoute allowedRoles={['caretaker']}><TenantAssist /></ProtectedRoute>} />
      <Route path="/caretaker/maintenance" element={<ProtectedRoute allowedRoles={['caretaker']}><CaretakerMaintenance /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
