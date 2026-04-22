import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewSale from "./pages/NewSale";
import CylinderReturns from "./pages/CylinderReturns";
import CustomersRoutes from "./pages/Customers";
import Products from "./pages/Products";
import Accounts from "./pages/Accounts";
import Expenses from "./pages/Expenses";
import Payroll from "./pages/Payroll";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, checkingSession } = useAuth();
  if (checkingSession) return null; // brief check against the backend before trusting a stored session
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="sales/new" element={<NewSale />} />
        <Route path="cylinder-returns" element={<CylinderReturns />} />
        <Route path="customers/*" element={<CustomersRoutes />} />
        <Route path="products" element={<Products />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="reports" element={<Reports />} />
        <Route
          path="settings"
          element={
            <AdminRoute>
              <Settings />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
