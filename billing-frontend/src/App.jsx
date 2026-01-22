import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Quotation from './pages/Quotation';
import Quotations from './pages/Quotations';
import Invoices from './pages/Invoices';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { isAuthenticated } from './services/authService';

const ProtectedRoute = () => {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
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
            <Route path="invoices" element={<Invoices />} />
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
