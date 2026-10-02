import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
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
import IrrigationLoader from './components/IrrigationLoader';

import EWayBillSandbox from './pages/EWayBillSandbox';

const ProtectedRoute = () => {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Run initial system boot loader to 100% completion then smoothly fade out
    const timer = setTimeout(() => {
      setFadeOut(true);
      const removeTimer = setTimeout(() => {
        setIsBooting(false);
      }, 500);
      return () => clearTimeout(removeTimer);
    }, 3600);

    return () => clearTimeout(timer);
  }, []);

  if (isBooting) {
    return (
      <div className={`fixed inset-0 z-[9999] bg-[#090D16] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <IrrigationLoader isInitialBoot={true} message="INITIALIZING BILLING SYSTEM & SECURE WORKSPACE..." />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
