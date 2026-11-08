import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Receipt,
    FileText,
    Users,
    ShoppingBag,
    Brain,
    ArrowRight,
    ShieldCheck,
    Building2,
    LogOut,
    ChevronDown
} from 'lucide-react';
import GhostFibers from '../components/GhostFibers';
import ThemeToggle from '../components/ThemeToggle';
import HoldButton from '../components/HoldButton';
import TechText from '../components/TechText';
import { useTheme } from '../context/ThemeContext';
import { getCurrentUser, logout } from '../services/authService';

const LandingPage = () => {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const currentUser = getCurrentUser();
    const username = currentUser?.username || 'Executive';
    const userRole = currentUser?.role ? currentUser.role.toUpperCase() : 'ADMIN';

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to sign out?")) {
            logout();
        }
    };

    const quickModules = [
        {
            title: 'Executive Dashboard',
            desc: 'Real-time revenue telemetry, aging analysis, and quotation pipeline',
            icon: LayoutDashboard,
            path: '/dashboard',
            primary: true,
            badge: 'Primary Hub',
            accent: 'orange'
        },
        {
            title: 'Tax Invoices & Billing',
            desc: 'Generate GST-compliant tax invoices, e-way bills, and manage receivables',
            icon: Receipt,
            path: '/invoices',
            badge: 'Finance',
            accent: 'orange'
        },
        {
            title: 'Quotation Pipeline',
            desc: 'Create proposals, track conversion stages, and manage price estimates',
            icon: FileText,
            path: '/quotations',
            badge: 'Sales CRM',
            accent: 'indigo'
        },
        {
            title: 'Customer Directory',
            desc: 'Farmer & dealer master records, GSTIN validation, and ledger history',
            icon: Users,
            path: '/customers',
            badge: 'Directory',
            accent: 'indigo'
        },
        {
            title: 'Purchase Orders',
            desc: 'Procurement workflows, vendor ledger tracking, and supplier items',
            icon: ShoppingBag,
            path: '/purchase-orders',
            badge: 'Procurement',
            accent: 'indigo'
        },
        {
            title: 'Agent Intelligence',
            desc: 'Autonomous financial anomaly checks and payment reminder triggers',
            icon: Brain,
            path: '/insights',
            badge: 'AI Engine',
            accent: 'indigo'
        }
    ];

    return (
        <div className="relative min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] selection:bg-[#FF7A18]/30 selection:text-[#FF7A18]">
            {/* Ghost Fibers Background Canvas - Fixed across the entire scrolling experience */}
            <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${isDark ? 'opacity-90' : 'opacity-70'}`}>
                <GhostFibers
                    className="w-full h-full"
                    glowColor="#FF7A18"
                    lineColor={isDark ? "#FFC27A" : "#FF923D"}
                    secondaryColor={isDark ? "#4F46E5" : "#FDBA74"}
                    fiberStyle="lines"
                    speed={0.45}
                    layers={3}
                    density={1.2}
                    thickness={isDark ? 1.6 : 1.3}
                    glow={isDark ? 2.4 : 1.2}
                    brightness={isDark ? 1.4 : 1.0}
                    sparkle={0.6}
                    mouseInteraction={true}
                    hoverEffect="focus"
                />
            </div>

            {/* Subtle Vignette Gradient across viewport */}
            <div className={`fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b ${isDark ? 'from-[#0B0B0D]/60 via-transparent to-[#0B0B0D]/80' : 'from-[#F8F8FA]/60 via-transparent to-[#F8F8FA]/80'}`} />

            {/* Top Navigation Bar */}
            <header className={`relative z-10 px-6 sm:px-12 py-5 sm:py-6 flex items-center justify-between border-b backdrop-blur-md transition-colors duration-200 ${
                isDark
                    ? 'border-[#1F2B45]/70 bg-[#0B0F19]/80'
                    : 'border-[#E4E4E7] bg-white/85 shadow-xs'
            }`}>
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF7A18] to-[#EA580C] p-2 flex items-center justify-center shadow-lg shadow-[#FF7A18]/25 border border-[#FF7A18]/30">
                        <Building2 className="text-white" size={22} />
                    </div>
                    <div>
                        <span className={`text-base font-extrabold tracking-tight block leading-tight ${
                            isDark ? 'text-[#F8FAFC]' : 'text-[#18181B]'
                        }`}>
                            FINE FLOW IRRIGATION
                        </span>
                        <span className="text-[10px] font-bold text-[#FF7A18] uppercase tracking-[0.22em] block">
                            Billing & Enterprise CRM
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
                        isDark
                            ? 'bg-[#111726] border-[#1F2B45]'
                            : 'bg-[#F4F4F5] border-[#E4E4E7]'
                    }`}>
                        <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                        <span className="text-[#94A3B8] font-medium">Session:</span>
                        <span className={`font-semibold capitalize ${isDark ? 'text-[#F8FAFC]' : 'text-[#18181B]'}`}>{username}</span>
                        <span className="text-[10px] font-bold text-[#FF7A18] px-1.5 py-0.2 rounded bg-[#FF7A18]/15 border border-[#FF7A18]/30">{userRole}</span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className={`p-2 rounded-xl border border-transparent transition-all cursor-pointer ${
                            isDark
                                ? 'text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#111726] hover:border-[#1F2B45]'
                                : 'text-[#71717A] hover:text-[#EF4444] hover:bg-[#F4F4F5] hover:border-[#E4E4E7]'
                        }`}
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* =========================================================
                SECTION 1: HERO VIEWPORT (Occupies 100% initial screen below header)
                No module cards visible anywhere in this initial viewport.
                ========================================================= */}
            <section className="relative z-10 min-h-[calc(100svh-82px)] flex flex-col justify-between items-center px-6 py-8 sm:py-12 text-center max-w-4xl mx-auto w-full">
                {/* Top Spacer for vertical balance */}
                <div className="hidden sm:block h-2" />

                {/* Centered Hero Content */}
                <div className="my-auto max-w-3xl w-full flex flex-col items-center justify-center animate-fadeIn">
                    <h1 className="sr-only">Fine Flow Irrigation</h1>
                    <div className="w-full h-24 sm:h-36 md:h-44 lg:h-48 max-w-3xl mb-4 sm:mb-6 relative flex items-center justify-center">
                        <TechText
                            text="Fine Flow Irrigation"
                            fontWeight={800}
                            fontSize={130}
                            letterSpacing={-0.03}
                            color={isDark ? '#FF7A18' : '#00008B'}
                            accentColor={isDark ? '#FF7A18' : '#00008B'}
                            reveal="letter"
                            dashLength={4}
                            dashGap={2}
                            specks={15}
                            intro="none"
                            introDuration={2}
                            clickKick={true}
                            draggable={true}
                            guides={false}
                            sweep={true}
                            className="w-full h-full"
                        />
                    </div>

                    <p className="text-base sm:text-lg lg:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto font-normal">
                        Manage end-to-end sales pipelines, tax invoicing, automated receivables aging, and customer catalogs from one unified terminal.
                    </p>

                    {/* Primary Action Buttons */}
                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
                        <HoldButton
                            size="lg"
                            radius={12}
                            holdTime={1100}
                            releaseTime={200}
                            fillDirection="right"
                            wave={true}
                            waveAmplitude={6}
                            glow={true}
                            backgroundColor={isDark ? '#FF7A18' : '#00008B'}
                            fillColor={isDark ? '#EA580C' : '#000066'}
                            textColor="#FFFFFF"
                            fillTextColor="#FFFFFF"
                            className={`w-full sm:w-auto font-bold text-sm sm:text-base border shadow-lg transition-transform hover:-translate-y-0.5 ${
                                isDark
                                    ? 'border-[#FF7A18] shadow-[#FF7A18]/25'
                                    : 'border-[#00008B] shadow-[#00008B]/25 hover:bg-[#000070]'
                            }`}
                            onHold={() => navigate('/dashboard')}
                            onTap={() => navigate('/dashboard')}
                            doneLabel="Entering Dashboard..."
                            doneIcon={<ArrowRight size={18} />}
                        >
                            <span>Launch Dashboard</span>
                            <ArrowRight size={18} />
                        </HoldButton>

                        <button
                            onClick={() => navigate('/invoices/new')}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl font-semibold text-sm sm:text-base text-[var(--text-primary)] bg-[var(--card-bg)] hover:bg-[var(--surface-secondary)] border border-[var(--border-main)] hover:border-[#FF7A18]/50 transition-all cursor-pointer shadow-sm"
                        >
                            <Receipt size={18} className="text-[#FF7A18]" />
                            <span>Direct Invoice</span>
                        </button>
                    </div>
                </div>

                {/* Subtle Scroll Cue to encourage natural discovery */}
                <div className="pb-2 pt-6">
                    <button
                        type="button"
                        onClick={() => document.getElementById('modules-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="inline-flex flex-col items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[#FF7A18] transition-colors cursor-pointer group select-none"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] group-hover:text-[#FF7A18] transition-colors">
                            Explore Modules
                        </span>
                        <ChevronDown size={18} className="animate-bounce text-[#FF7A18]" />
                    </button>
                </div>
            </section>

            {/* =========================================================
                SECTION 2: MODULE CARDS (Positioned below hero fold)
                Revealed naturally when the user scrolls down.
                ========================================================= */}
            <section id="modules-section" className="relative z-10 max-w-6xl mx-auto px-6 py-20 sm:py-28 w-full">
                {/* Section Header */}
                <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7A18]/10 border border-[#FF7A18]/25 text-[#FF7A18] text-[10px] font-bold uppercase tracking-[0.22em] mb-3">
                        <span>Operational Ecosystem</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        Dedicated Workspace Terminals
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2.5 max-w-lg mx-auto font-normal">
                        Access high-throughput financial tooling, GST invoicing, CRM intelligence, and procurement pipelines.
                    </p>
                </div>

                {/* Quick Navigation Cards Grid (Liquid Glass) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                    {quickModules.map((item, idx) => {
                        const Icon = item.icon;
                        const isPrimary = item.primary;
                        const isOrangeAccent = isPrimary || item.accent === 'orange';

                        return (
                            <Link
                                key={idx}
                                to={item.path}
                                className={`liquid-glass-card group p-5 sm:p-6 flex flex-col justify-between cursor-pointer ${isPrimary ? 'primary' : ''
                                    }`}
                            >
                                {/* Subtle internal radial specular highlight */}
                                <div
                                    className={`pointer-events-none absolute -top-14 -left-14 w-44 h-44 rounded-full blur-2xl transition-opacity duration-300 ${isPrimary
                                            ? 'bg-gradient-to-br from-[#FF7A18]/20 to-transparent opacity-60 group-hover:opacity-100'
                                            : isOrangeAccent
                                                ? 'bg-gradient-to-br from-[#FF7A18]/15 to-transparent opacity-40 group-hover:opacity-85'
                                                : 'bg-gradient-to-br from-[#818CF8]/15 via-white/5 to-transparent opacity-35 group-hover:opacity-75'
                                        }`}
                                />

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4.5">
                                        {/* Liquid Glass Icon Well */}
                                        <div
                                            className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${isPrimary
                                                    ? 'bg-gradient-to-br from-[#FF7A18]/25 to-[#FF7A18]/10 border border-[#FF7A18]/45 text-[#FF7A18] shadow-[0_2px_12px_rgba(255,122,24,0.25)] group-hover:scale-105 group-hover:border-[#FF7A18]'
                                                    : isOrangeAccent
                                                        ? 'bg-gradient-to-br from-[#FF7A18]/20 to-[#FF7A18]/5 border border-[#FF7A18]/35 text-[#FF7A18] shadow-[0_2px_10px_rgba(255,122,24,0.18)] group-hover:scale-105 group-hover:border-[#FF7A18]/60'
                                                        : 'bg-white/[0.05] border border-white/12 text-[#818CF8] group-hover:text-[#FF7A18] group-hover:border-[#FF7A18]/40 group-hover:bg-[#FF7A18]/10 group-hover:scale-105 shadow-sm'
                                                }`}
                                        >
                                            <Icon size={21} className="transition-transform duration-300 group-hover:rotate-3" />
                                        </div>

                                        {/* Micro Capsule Badge */}
                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border transition-all duration-300 ${isPrimary
                                                    ? 'bg-[#FF7A18]/15 text-[#FF7A18] border-[#FF7A18]/40 shadow-[0_0_10px_rgba(255,122,24,0.15)] group-hover:border-[#FF7A18]/70'
                                                    : 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/25 group-hover:border-[#6366F1]/45 shadow-[0_0_8px_rgba(99,102,241,0.1)]'
                                                }`}
                                        >
                                            {item.badge}
                                        </span>
                                    </div>

                                    {/* Typography Hierarchy */}
                                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-white dark:group-hover:text-white transition-colors duration-200 mb-1.5 flex items-center gap-1.5 tracking-tight">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 font-normal">
                                        {item.desc}
                                    </p>
                                </div>

                                {/* Access Module Footer Section */}
                                <div className="relative z-10 mt-5 pt-3.5 border-t border-white/[0.08] dark:border-white/[0.08] border-black/[0.06] flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[#FF7A18] transition-colors duration-200">
                                    <span className="tracking-wide">Access Module</span>
                                    <ArrowRight size={14} className="transition-all duration-300 group-hover:translate-x-1.5 text-[var(--text-muted)] group-hover:text-[#FF7A18]" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* Bottom Footer */}
            <footer className="relative z-10 px-6 sm:px-12 py-6 border-t border-[#1F2B45]/70 bg-[#0B0F19]/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#22C55E]" />
                    <span>Protected Financial Terminal • Fine Flow Irrigation Coimbatore</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span>GSTIN Active • System Health:</span>
                    <span className="text-[#22C55E] font-semibold">100% Operational</span>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
