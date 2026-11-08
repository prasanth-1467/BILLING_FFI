import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Quotation from './pages/Quotation';
import Quotations from './pages/Quotations';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import Profile from './pages/Profile';
import Login from './pages/Login';
import AgentInsights from './pages/AgentInsights';
import PurchaseOrder from './pages/PurchaseOrder';
import PurchaseOrders from './pages/PurchaseOrders';
import { isAuthenticated } from './services/authService';
import EWayBillSandbox from './pages/EWayBillSandbox';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

const ProtectedRoute = () => {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          {/* Executive Landing Portal with Ghost Fibers Background */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />

          {/* Main Application Shell */}
          <Route element={<MainLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="customers" element={<Customers />} />
            <Route path="quotation" element={<Quotation />} />
            <Route path="quotations" element={<Quotations />} />
            <Route path="quotations/new" element={<Quotation />} />
            <Route path="quotations/edit/:id" element={<Quotation />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="purchase-orders/new" element={<PurchaseOrder />} />
            <Route path="purchase-orders/edit/:id" element={<PurchaseOrder />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<CreateInvoice />} />
            <Route path="invoices/edit/:id" element={<CreateInvoice />} />
            <Route path="ewaybill-sandbox" element={<EWayBillSandbox />} />
            <Route path="ewaybill-test.html" element={<EWayBillSandbox />} />
            <Route path="insights" element={<AgentInsights />} />
            <Route path="profile" element={<Profile />} />
            {/* Redirect unknown routes to Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  </ThemeProvider>
  );
}

export default App;
