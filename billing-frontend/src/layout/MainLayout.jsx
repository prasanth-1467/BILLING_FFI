import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../services/authService';
import {
    LayoutDashboard,
    Package,
    Users,
    FileText,
    Receipt,
    Menu,
    Bell,
    UserCircle,
    LogOut,
    ShoppingBag
} from 'lucide-react';
import '../index.css';

const SidebarItem = ({ to, icon: Icon, label }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors duration-200 ${isActive ? 'bg-gray-800 text-white border-r-4 border-blue-500' : ''
                }`
            }
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </NavLink>
    );
};

const MainLayout = () => {
    const location = useLocation();

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/': return 'Dashboard';
            case '/products': return 'Products';
            case '/customers': return 'Customers';
            case '/quotation': return 'New Quotation';
            case '/purchase-orders': return 'Purchase Orders';
            case '/purchase-orders/new': return 'New Purchase Order';
            case '/invoices': return 'Invoices';
            default: return 'Dashboard';
        }
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logout();
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-gray-900 text-white shadow-xl flex flex-col">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <FileText size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Fine Flow Irrigation</h1>
                        <p className="text-xs text-gray-400">GST Billing System</p>
                    </div>
                </div>

                <nav className="flex-1 py-6 space-y-1">
                    <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarItem to="/products" icon={Package} label="Products" />
                    <SidebarItem to="/customers" icon={Users} label="Customers" />
                    <SidebarItem to="/quotations" icon={FileText} label="Quotations" />
                    <SidebarItem to="/quotation" icon={FileText} label="Create Quotation" />
                    <SidebarItem to="/purchase-orders" icon={ShoppingBag} label="Purchase Orders" />
                    <SidebarItem to="/purchase-orders/new" icon={ShoppingBag} label="Create PO" />
                    <SidebarItem to="/invoices" icon={Receipt} label="Invoices" />
                    <SidebarItem to="/profile" icon={UserCircle} label="Profile" />
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <span className="text-xs font-bold">PT</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium">Prasanth Thangaraj</p>
                            <p className="text-xs text-gray-500">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8 z-10">
                    <h2 className="text-2xl font-semibold text-gray-800">{getPageTitle()}</h2>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                            <Bell size={20} />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Logout"
                        >
                            <LogOut size={24} />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
