import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
/* eslint-disable no-unused-vars */
import { logout } from '../services/authService';
import {
    LayoutDashboard,
    Package,
    Users,
    FileText,
    Receipt,
    Menu,
    Bell as BellIcon,
    UserCircle,
    LogOut,
    ShoppingBag,
    Brain
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import '../index.css';

const SidebarItem = ({ to, icon: Icon, label }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-300 group ${isActive
                    ? 'bg-indigo-600/10 text-indigo-400 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`
            }
        >
            <Icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
            <span className="font-medium text-sm">{label}</span>
            {/* Active Indicator Dot */}
            <NavLink to={to} className={({ isActive }) => isActive ? "ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" : "hidden"} />
        </NavLink>
    );
};

const MainLayout = () => {
    const location = useLocation();

    const getPageTitle = () => {
        const pathMap = {
            '/': 'Dashboard Overview',
            '/products': 'Product Inventory',
            '/customers': 'Customer Directory',
            '/quotation': 'Draft New Quotation',
            '/quotations': 'Quotation History',
            '/purchase-orders': 'Purchase Management',
            '/purchase-orders/new': 'Raise Purchase Order',
            '/invoices': 'Billing & Invoices',
            '/insights': 'Business Intelligence',
            '/profile': 'User Profile'
        };
        return pathMap[location.pathname] || 'Dashboard';
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logout();
        }
    };

    return (
        <div className="flex h-screen bg-[#f8fafc]">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0f172a] text-slate-200 shadow-2xl flex flex-col z-20 border-r border-slate-800/50">
                <div className="p-6 mb-4">
                    <div className="flex items-center gap-3 group cursor-default">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform duration-300">
                            <FileText size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">Fine Flow</h1>
                            <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-[0.2em]">Irrigation</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
                    <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarItem to="/products" icon={Package} label="Products" />
                    <SidebarItem to="/customers" icon={Users} label="Customers" />
                    <SidebarItem to="/quotations" icon={FileText} label="Quotations" />
                    <SidebarItem to="/quotation" icon={FileText} label="Create Quotation" />
                    <SidebarItem to="/purchase-orders" icon={ShoppingBag} label="Purchase Orders" />
                    <SidebarItem to="/purchase-orders/new" icon={ShoppingBag} label="Create PO" />
                    <SidebarItem to="/invoices" icon={Receipt} label="Invoices" />

                    <div className="mt-8 mb-2 px-6">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">AI Insights</p>
                    </div>
                    <SidebarItem to="/insights" icon={Brain} label="Agent Intelligence" />

                    <div className="mt-auto pt-8">
                        <SidebarItem to="/profile" icon={UserCircle} label="Account Settings" />
                    </div>
                </nav>

                {/* Profile Section - Fixed Visibility */}
                <div className="p-4 mt-auto border-t border-slate-800/50 bg-slate-900/30">
                    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer group">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center border border-slate-500/30 group-hover:border-indigo-500/50 transition-colors">
                            <span className="text-xs font-bold text-white">PT</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-100 truncate">Prasanth Thangaraj</p>
                            <p className="text-[10px] font-medium text-slate-400">System Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header - Glassmorphism */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-8 z-10 sticky top-0">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div className="flex items-center gap-5">
                        <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
                        <NotificationBell />
                        <button
                            onClick={handleLogout}
                            className="group p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300"
                            title="Logout"
                        >
                            <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-[#f8fafc] p-6 lg:p-10">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
