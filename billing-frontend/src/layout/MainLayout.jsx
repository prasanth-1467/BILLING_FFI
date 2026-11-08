import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
/* eslint-disable no-unused-vars */
import { logout, getCurrentUser } from '../services/authService';
import {
    LayoutDashboard,
    Package,
    Users,
    FileText,
    FilePlus,
    Receipt,
    PlusCircle,
    Menu,
    X,
    UserCircle,
    LogOut,
    ShoppingBag,
    Brain,
    Truck,
    Sparkles,
    ChevronRight,
    Building2,
    Compass
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import ThemeToggle from '../components/ThemeToggle';
import '../index.css';

const NavSectionHeader = ({ title }) => (
    <div className="px-4 pt-4 pb-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF7A18]">
            {title}
        </p>
    </div>
);

const SidebarItem = ({
    to,
    icon: Icon,
    label,
    badge,
    exact = false,
    activeRoutes = [],
    onClick
}) => {
    const location = useLocation();
    const pathname = location.pathname;

    let isActive = false;
    if (activeRoutes.length > 0) {
        isActive = activeRoutes.some(route => {
            if (route.endsWith('/*')) {
                const base = route.slice(0, -2);
                return pathname === base || pathname.startsWith(base + '/');
            }
            return pathname === route;
        });
    } else if (exact) {
        isActive = pathname === to;
    } else {
        isActive = pathname === to || (to !== '/' && pathname.startsWith(to + '/'));
    }

    return (
        <Link
            to={to}
            onClick={onClick}
            className={`sidebar-nav-item group ${isActive ? 'active' : 'inactive'}`}
            title={label}
        >
            <Icon
                size={18}
                className="sidebar-nav-icon flex-shrink-0"
            />
            <span className="truncate">{label}</span>

            {badge && (
                <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                    isActive
                        ? 'bg-[#FF7A18]/20 text-[#FF7A18] border-[#FF7A18]/40'
                        : 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/30 group-hover:border-[#FF7A18]/30 group-hover:text-[#FF7A18]'
                }`}>
                    {badge}
                </span>
            )}

            {isActive && !badge && (
                <span className="active-indicator-dot" />
            )}
        </Link>
    );
};

const MainLayout = () => {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const currentUser = getCurrentUser();
    const userDisplayName = currentUser?.username || 'Executive';
    const userRole = currentUser?.role ? currentUser.role.toUpperCase() : 'ADMIN';
    const initials = userDisplayName.substring(0, 2).toUpperCase();

    // Close mobile drawer on ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const getPageMeta = () => {
        const pathMap = {
            '/dashboard': { title: 'Dashboard Overview', category: 'Executive CRM' },
            '/products': { title: 'Product Inventory', category: 'Master Data' },
            '/customers': { title: 'Customer Directory', category: 'Sales & CRM' },
            '/quotation': { title: 'Draft New Quotation', category: 'Sales Pipeline' },
            '/quotations': { title: 'Quotation Management', category: 'Sales Pipeline' },
            '/quotations/new': { title: 'Create Quotation', category: 'Sales Pipeline' },
            '/purchase-orders': { title: 'Purchase Orders', category: 'Procurement' },
            '/purchase-orders/new': { title: 'Raise Purchase Order', category: 'Procurement' },
            '/invoices': { title: 'Tax Invoices & Billing', category: 'Finance' },
            '/invoices/new': { title: 'Direct Invoice Builder', category: 'Finance' },
            '/ewaybill-test.html': { title: 'E-Way Bill Compliance', category: 'Logistics' },
            '/ewaybill-sandbox': { title: 'E-Way Bill Compliance', category: 'Logistics' },
            '/insights': { title: 'Agent Intelligence', category: 'Autonomous CRM' },
            '/profile': { title: 'Account Settings', category: 'System' }
        };

        if (location.pathname.startsWith('/quotations/edit/')) {
            return { title: 'Edit Quotation', category: 'Sales Pipeline' };
        }
        if (location.pathname.startsWith('/invoices/edit/')) {
            return { title: 'Edit Invoice', category: 'Finance' };
        }
        if (location.pathname.startsWith('/purchase-orders/edit/')) {
            return { title: 'Edit Purchase Order', category: 'Procurement' };
        }

        return pathMap[location.pathname] || { title: 'Dashboard', category: 'Overview' };
    };

    const pageMeta = getPageMeta();

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to logout?")) {
            logout();
        }
    };

    return (
        <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden">
            {/* Mobile Drawer Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Navigation Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 lg:static lg:w-64 bg-[var(--sidebar-bg)] text-[var(--text-primary)] shadow-2xl flex flex-col border-r border-[var(--border-main)] no-print transition-transform duration-300 ease-in-out ${
                    isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                }`}
            >
                {/* Brand Header */}
                <div className="p-5 flex items-center justify-between border-b border-[var(--border-main)]">
                    <Link to="/welcome" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF7A18] to-[#EA580C] p-2 flex items-center justify-center shadow-lg shadow-[#FF7A18]/25 group-hover:rotate-6 transition-transform duration-300 border border-[#FF7A18]/30">
                            <Building2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-extrabold tracking-tight text-[#F8FAFC] leading-tight flex items-center gap-1.5">
                                Fine Flow
                            </h1>
                            <p className="text-[10px] font-bold text-[#FF7A18] uppercase tracking-[0.22em]">
                                Irrigation & CRM
                            </p>
                        </div>
                    </Link>

                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] rounded-lg transition-colors cursor-pointer"
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto py-3 space-y-1 custom-scrollbar">
                    {/* Welcome Portal Link */}
                    <SidebarItem
                        to="/welcome"
                        icon={Compass}
                        label="Welcome Portal"
                        exact={true}
                        activeRoutes={['/welcome', '/landing']}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Main Overview */}
                    <SidebarItem
                        to="/dashboard"
                        icon={LayoutDashboard}
                        label="Dashboard"
                        exact={true}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Sales & Billing */}
                    <NavSectionHeader title="Sales & Billing" />
                    <SidebarItem
                        to="/invoices"
                        icon={Receipt}
                        label="Tax Invoices"
                        exact={true}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <SidebarItem
                        to="/invoices/new"
                        icon={PlusCircle}
                        label="Create Invoice"
                        activeRoutes={['/invoices/new', '/invoices/edit/*']}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <SidebarItem
                        to="/quotations"
                        icon={FileText}
                        label="Quotations"
                        exact={true}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <SidebarItem
                        to="/quotation"
                        icon={FilePlus}
                        label="Create Quotation"
                        activeRoutes={['/quotation', '/quotations/new', '/quotations/edit/*']}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <SidebarItem
                        to="/customers"
                        icon={Users}
                        label="Customers & CRM"
                        exact={true}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Procurement & Catalog */}
                    <NavSectionHeader title="Operations" />
                    <SidebarItem
                        to="/purchase-orders"
                        icon={ShoppingBag}
                        label="Purchase Orders"
                        activeRoutes={['/purchase-orders', '/purchase-orders/new', '/purchase-orders/edit/*']}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <SidebarItem
                        to="/products"
                        icon={Package}
                        label="Products & Inventory"
                        exact={true}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <SidebarItem
                        to="/ewaybill-test.html"
                        icon={Truck}
                        label="E-Way Bill Compliance"
                        activeRoutes={['/ewaybill-test.html', '/ewaybill-sandbox']}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />

                    {/* Intelligent Agents */}
                    <NavSectionHeader title="Automation" />
                    <SidebarItem
                        to="/insights"
                        icon={Brain}
                        label="Agent Intelligence"
                        badge="AI"
                        exact={true}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                </nav>

                {/* Profile Section Footer */}
                <div className="p-3.5 border-t border-[var(--border-main)] bg-[var(--surface-secondary)]">
                    <Link
                        to="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`sidebar-profile-link flex items-center gap-3 p-2 rounded-xl transition-colors group ${
                            location.pathname === '/profile' ? 'active' : ''
                        }`}
                    >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF7A18] to-[#EA580C] flex items-center justify-center border border-[#FF7A18]/40 group-hover:border-[#FF7A18] transition-colors flex-shrink-0">
                            <span className="text-xs font-bold text-white">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate capitalize profile-name">{userDisplayName}</p>
                            <p className="text-[10px] font-bold text-[#FF7A18] tracking-wider">{userRole}</p>
                        </div>
                        <ChevronRight size={16} className="profile-chevron transition-colors" />
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[var(--bg-main)]">
                {/* Header - Glassmorphic Surface */}
                <header className="bg-[var(--sidebar-bg)]/90 backdrop-blur-md border-b border-[var(--border-main)] h-16 flex items-center justify-between px-4 sm:px-8 z-30 sticky top-0 no-print">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile Hamburger Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors flex-shrink-0 cursor-pointer"
                            aria-label="Open navigation menu"
                        >
                            <Menu size={22} />
                        </button>

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7A18] bg-[#FF7A18]/15 px-2 py-0.5 rounded-md border border-[#FF7A18]/30 hidden sm:inline-block">
                                    {pageMeta.category}
                                </span>
                                <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight truncate">
                                    {pageMeta.title}
                                </h2>
                            </div>
                            <p className="text-[10px] sm:text-xs text-[var(--text-muted)] font-medium truncate hidden sm:block">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Header Action Controls */}
                    <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                        <ThemeToggle />
                        <div className="h-7 w-[1px] bg-[var(--border-main)] hidden sm:block"></div>
                        <NotificationBell />
                        <button
                            onClick={handleLogout}
                            className="group p-2 text-[var(--text-secondary)] hover:text-[#EF4444] hover:bg-[var(--surface-secondary)] rounded-xl border border-transparent hover:border-[var(--border-main)] transition-all duration-200 cursor-pointer"
                            title="Sign out"
                            aria-label="Logout"
                        >
                            <LogOut size={19} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </header>

                {/* Page Viewport */}
                <main className="flex-1 overflow-auto bg-[var(--bg-main)] p-4 sm:p-6 lg:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
