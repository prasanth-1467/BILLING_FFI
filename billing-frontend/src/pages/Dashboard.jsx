import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    AlertTriangle,
    Clock,
    FileText,
    Plus,
    Users,
    MessageCircle,
    CheckCircle,
    X,
    IndianRupee,
    ArrowRight,
    Sparkles,
    RefreshCcw,
    Brain,
    Package,
    Lightbulb,
    Info,
    ExternalLink
} from 'lucide-react';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format, differenceInDays, isPast, startOfDay, subDays } from 'date-fns';
import PageHeader from '../components/common/PageHeader';
import TableSkeleton from '../components/common/TableSkeleton';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';

const Dashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Consolidated Dashboard Telemetry State
    const [stats, setStats] = useState({
        totalSales: 0,
        totalInvoices: 0,
        totalCustomers: 0,
        lowStockCount: 0,
        totalReceivables: 0,
        overdueReceivables: 0,
        overdueCount: 0,
        dueTodayCount: 0,
        aging: {
            current: { amount: 0, count: 0 },
            days1to30: { amount: 0, count: 0 },
            days31to60: { amount: 0, count: 0 },
            days61to90: { amount: 0, count: 0 },
            days90plus: { amount: 0, count: 0 }
        },
        dailySales: [],
        topReceivableCustomers: [],
        quotationPipeline: {
            totalCount: 0,
            totalValue: 0,
            byStatus: {
                Draft: { count: 0, value: 0 },
                Sent: { count: 0, value: 0 },
                Approved: { count: 0, value: 0 },
                Converted: { count: 0, value: 0 }
            },
            conversionRate: 0
        },
        agentNotifications: []
    });

    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [chartData, setChartData] = useState([]);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    const fetchDashboardTelemetry = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        try {
            const [statsRes, invoicesRes] = await Promise.all([
                api.get('/stats'),
                api.get('/invoices')
            ]);

            const statsData = statsRes.data || {};
            const allInvoices = invoicesRes.data || [];

            // Filter pending/unpaid invoices for the workspace table
            const pendingList = allInvoices
                .filter(inv => {
                    const bal = inv.balance != null ? inv.balance : ((inv.total || 0) - (inv.paidAmount || 0));
                    return bal > 0;
                })
                .sort((a, b) => {
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });

            setUnpaidInvoices(pendingList);

            // Format chart data (30 days daily sales)
            const today = startOfDay(new Date());
            const formattedChart = [];
            for (let i = 29; i >= 0; i--) {
                const targetDay = subDays(today, i);
                const dayKey = format(targetDay, 'yyyy-MM-dd');
                const label = format(targetDay, 'MMM dd');

                const found = (statsData.dailySales || []).find(d => d._id === dayKey);
                formattedChart.push({
                    date: label,
                    Revenue: found ? found.total : 0
                });
            }
            setChartData(formattedChart);

            setStats(prev => ({
                ...prev,
                ...statsData
            }));
        } catch (error) {
            console.error("Failed to fetch executive dashboard data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardTelemetry();
    }, []);

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!paymentInvoice || !paymentAmount || Number(paymentAmount) <= 0) {
            alert("Please enter a valid payment amount.");
            return;
        }

        setProcessingPayment(true);
        try {
            const invoiceId = paymentInvoice._id || paymentInvoice.id;
            await api.patch(`/invoices/${invoiceId}/payment`, {
                amount: Number(paymentAmount)
            });
            setShowPaymentModal(false);
            setPaymentInvoice(null);
            setPaymentAmount('');
            fetchDashboardTelemetry(true);
        } catch (error) {
            console.error("Failed to record payment", error);
            alert(error.response?.data?.error || "Failed to record payment");
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleShareWhatsApp = (invoice) => {
        const phone = invoice.customerId?.phone || invoice.customerPhone;
        if (!phone) {
            alert('Customer does not have a contact phone number saved.');
            return;
        }
        const custName = invoice.customerId?.name || invoice.customerName || 'Valued Customer';
        const bal = invoice.balance ?? (invoice.total - (invoice.paidAmount || 0));
        const dueDateStr = invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'immediate';

        const text = `Hello ${custName},\n\nGreetings from *Fine Flow Irrigation*.\n\nThis is a friendly statement regarding Tax Invoice *#${invoice.invoiceNumber}* for *₹${Number(invoice.total || 0).toLocaleString('en-IN')}*.\nPending Balance: *₹${Number(bal).toLocaleString('en-IN')}* (Due: ${dueDateStr}).\n\nPlease let us know if you need the invoice copy or bank transfer details.\n\nThank you for your business!`;
        const wsUrl = `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        window.open(wsUrl, '_blank');
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'alert':
                return <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />;
            case 'suggestion':
                return <Lightbulb size={16} className="text-amber-500 flex-shrink-0" />;
            default:
                return <Info size={16} className="text-indigo-500 flex-shrink-0" />;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-fadeIn pb-12">
                <PageHeader
                    title="Executive CRM & Billing Command Center"
                    subtitle="Real-time cashflow telemetry, receivables aging, quotation pipeline, and autonomous agent monitoring"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-[#111726] p-5 rounded-2xl border border-[#1F2B45] shadow-sm animate-pulse h-28" />
                    ))}
                </div>
                <TableSkeleton rows={6} cols={5} />
            </div>
        );
    }

    // Compute aging calculations for visual bars
    const totalAgingAmount = stats.totalReceivables || 1; // avoid division by 0
    const agingBuckets = [
        { key: 'current', label: 'Current / Due Today', data: stats.aging?.current, color: 'bg-[#22C55E]', bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', border: 'border-[#22C55E]/20' },
        { key: 'days1to30', label: '1 - 30 Days', data: stats.aging?.days1to30, color: 'bg-[#F59E0B]', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/20' },
        { key: 'days31to60', label: '31 - 60 Days', data: stats.aging?.days31to60, color: 'bg-[#FF7A18]', bg: 'bg-[#FF7A18]/10', text: 'text-[#FF7A18]', border: 'border-[#FF7A18]/20' },
        { key: 'days61to90', label: '61 - 90 Days', data: stats.aging?.days61to90, color: 'bg-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
        { key: 'days90plus', label: '90+ Days Critical', data: stats.aging?.days90plus, color: 'bg-[#EF4444]', bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', border: 'border-[#EF4444]/20' }
    ];

    return (
        <div className="space-y-6 animate-fadeIn pb-12">
            {/* Executive Header */}
            <PageHeader
                title="Executive CRM & Billing Command Center"
                subtitle="Live cashflow telemetry, receivables aging, quotation conversion pipeline, and autonomous agent monitoring"
                badge="FFI Telemetry Active"
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/quotation')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-white bg-[#FF7A18] hover:bg-[#FF923D] rounded-xl shadow-md shadow-[#FF7A18]/25 hover:shadow-[#FF7A18]/40 transition-all duration-150 cursor-pointer"
                        >
                            <Plus size={16} /> New Quotation
                        </button>
                        <button
                            onClick={() => navigate('/invoices/new')}
                            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-[#F8FAFC] bg-[#111726] hover:bg-[#172033] border border-[#1F2B45] hover:border-[#FF7A18]/50 rounded-xl transition-all duration-150 cursor-pointer"
                        >
                            <FileText size={16} /> Direct Invoice
                        </button>
                        <button
                            onClick={() => fetchDashboardTelemetry(true)}
                            disabled={refreshing}
                            className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] bg-[#111726] hover:bg-[#172033] border border-[#1F2B45] rounded-xl transition-colors cursor-pointer"
                            title="Sync live stats"
                        >
                            <RefreshCcw size={16} className={refreshing ? 'animate-spin text-[#FF7A18]' : ''} />
                        </button>
                    </div>
                }
            />

            {/* 1. Executive Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Reconciled Sales */}
                <div className="bg-[#111726] p-5 rounded-2xl border border-[#1F2B45] shadow-sm hover:border-[#FF7A18]/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-xl bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E] border border-[#22C55E]/30">
                            <TrendingUp size={22} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                            Reconciled
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Collected Sales
                    </p>
                    <h3 className="text-2xl font-black text-[#F8FAFC] mt-1">
                        ₹ {Number(stats.totalSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] mt-1 flex items-center gap-1">
                        <span>{stats.totalInvoices} total invoices issued</span>
                    </p>
                </div>

                {/* Total Outstanding Receivables */}
                <div className="bg-[#111726] p-5 rounded-2xl border border-[#1F2B45] shadow-sm hover:border-[#FF7A18]/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center text-[#F59E0B] border border-[#F59E0B]/30">
                            <Clock size={22} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                            Pending
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Total Receivables
                    </p>
                    <h3 className="text-2xl font-black text-[#F8FAFC] mt-1">
                        ₹ {Number(stats.totalReceivables || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </h3>
                    <p className="text-[11px] text-[#F59E0B] font-medium mt-1">
                        {unpaidInvoices.length} invoices awaiting payment
                    </p>
                </div>

                {/* Critical Overdue Balance */}
                <div className="bg-[#111726] p-5 rounded-2xl border border-[#1F2B45] shadow-sm hover:border-[#EF4444]/60 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-xl bg-[#EF4444]/15 flex items-center justify-center text-[#EF4444] border border-[#EF4444]/30">
                            <AlertTriangle size={22} />
                        </div>
                        {stats.overdueCount > 0 ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] animate-pulse border border-[#EF4444]/30">
                                {stats.overdueCount} Overdue
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                                0 Overdue
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Overdue Receivables
                    </p>
                    <h3 className="text-2xl font-black text-[#EF4444] mt-1">
                        ₹ {Number(stats.overdueReceivables || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] mt-1">
                        {stats.dueTodayCount > 0 ? `${stats.dueTodayCount} due today` : 'No invoices due today'}
                    </p>
                </div>

                {/* Quotation Pipeline & Win Rate */}
                <div className="bg-[#111726] p-5 rounded-2xl border border-[#1F2B45] shadow-sm hover:border-[#FF7A18]/40 transition-all">
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-11 h-11 rounded-xl bg-[#FF7A18]/15 flex items-center justify-center text-[#FF7A18] border border-[#FF7A18]/30">
                            <Sparkles size={22} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF7A18]/15 text-[#FF7A18] border border-[#FF7A18]/30">
                            {stats.quotationPipeline?.conversionRate || 0}% Win Rate
                        </span>
                    </div>
                    <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                        Quotation Pipeline
                    </p>
                    <h3 className="text-2xl font-black text-[#F8FAFC] mt-1">
                        ₹ {Number(stats.quotationPipeline?.totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </h3>
                    <p className="text-[11px] text-[#FF7A18] font-medium mt-1">
                        {stats.quotationPipeline?.totalCount || 0} active proposals
                    </p>
                </div>
            </div>

            {/* 2. Receivables Aging Meter & Quotation Pipeline Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Receivables Aging Breakdown */}
                <div className="bg-[#111726] p-6 rounded-2xl border border-[#1F2B45] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock size={18} className="text-[#FF7A18]" />
                                <h3 className="text-base font-bold text-[#F8FAFC]">
                                    Receivables Aging Analysis
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-[#94A3B8]">
                                Total: ₹ {Number(stats.totalReceivables || 0).toLocaleString('en-IN')}
                            </span>
                        </div>

                        {/* Stacked Visual Bar */}
                        <div className="w-full h-3 rounded-full bg-[#0B0F19] border border-[#1F2B45] overflow-hidden flex mb-5">
                            {agingBuckets.map(b => {
                                const pct = Math.max(0, Math.min(100, Math.round(((b.data?.amount || 0) / totalAgingAmount) * 100)));
                                if (pct <= 0) return null;
                                return (
                                    <div
                                        key={b.key}
                                        style={{ width: `${pct}%` }}
                                        className={`${b.color} transition-all duration-300`}
                                        title={`${b.label}: ₹ ${(b.data?.amount || 0).toLocaleString('en-IN')} (${pct}%)`}
                                    />
                                );
                            })}
                        </div>

                        {/* Bucket Breakdown List */}
                        <div className="space-y-2.5">
                            {agingBuckets.map(b => {
                                const amount = b.data?.amount || 0;
                                const count = b.data?.count || 0;
                                const pct = Math.round((amount / totalAgingAmount) * 100);

                                return (
                                    <div
                                        key={b.key}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border ${b.border} ${b.bg}`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={`w-2.5 h-2.5 rounded-full ${b.color} flex-shrink-0`} />
                                            <span className="text-xs font-bold text-[#F8FAFC] truncate">
                                                {b.label}
                                            </span>
                                            <span className="text-[10px] text-[#94A3B8] font-medium hidden sm:inline">
                                                ({count} inv)
                                            </span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className={`text-xs font-black ${b.text}`}>
                                                ₹ {Number(amount).toLocaleString('en-IN')}
                                            </span>
                                            <span className="text-[10px] text-[#64748B] font-medium ml-2">
                                                {pct}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#1F2B45] flex items-center justify-between text-xs text-[#94A3B8]">
                        <span>Aging evaluated against invoice due date.</span>
                        <button
                            onClick={() => navigate('/invoices')}
                            className="font-bold text-[#FF7A18] hover:text-[#FF923D] flex items-center gap-1 hover:underline cursor-pointer"
                        >
                            Open Invoices <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Quotation Pipeline Funnel */}
                <div className="bg-[#111726] p-6 rounded-2xl border border-[#1F2B45] shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-[#FF7A18]" />
                                <h3 className="text-base font-bold text-[#F8FAFC]">
                                    Quotation Conversion Pipeline
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-[#FF7A18] bg-[#FF7A18]/15 px-2.5 py-0.5 rounded-full border border-[#FF7A18]/30">
                                {stats.quotationPipeline?.conversionRate || 0}% Converted
                            </span>
                        </div>

                        {/* Funnel Stages */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                            {[
                                { stage: 'Draft', bg: 'bg-[#172033]', text: 'text-[#94A3B8]', border: 'border-[#1F2B45]' },
                                { stage: 'Sent', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
                                { stage: 'Approved', bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', border: 'border-[#22C55E]/20' },
                                { stage: 'Converted', bg: 'bg-[#FF7A18]/10', text: 'text-[#FF7A18]', border: 'border-[#FF7A18]/20' }
                            ].map(item => {
                                const count = stats.quotationPipeline?.byStatus?.[item.stage]?.count || 0;
                                const val = stats.quotationPipeline?.byStatus?.[item.stage]?.value || 0;

                                return (
                                    <div key={item.stage} className={`p-3 rounded-xl border ${item.border} ${item.bg} text-center`}>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                                            {item.stage}
                                        </p>
                                        <p className="text-lg font-black text-[#F8FAFC] mt-1">
                                            {count}
                                        </p>
                                        <p className={`text-[10px] font-bold ${item.text} mt-0.5 truncate`}>
                                            ₹ {(val / 1000).toFixed(1)}k
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Top Exposure Customers */}
                        <div>
                            <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-2.5">
                                Top Accounts by Receivable Exposure
                            </p>
                            <div className="space-y-2">
                                {(stats.topReceivableCustomers && stats.topReceivableCustomers.length > 0) ? (
                                    stats.topReceivableCustomers.slice(0, 4).map((acc, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 rounded-xl bg-[#172033] border border-[#1F2B45] hover:bg-[#232328] transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="w-5 h-5 rounded-full bg-[#0B0F19] text-[#94A3B8] border border-[#1F2B45] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-[#F8FAFC] truncate">
                                                        {acc.customerName}
                                                    </p>
                                                    <p className="text-[10px] text-[#64748B]">
                                                        {acc.invoiceCount} pending invoices
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-[#EF4444] flex-shrink-0">
                                                ₹ {Number(acc.balance || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-[#64748B] italic py-2">
                                        No outstanding receivable balances recorded.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#1F2B45] flex items-center justify-between text-xs text-[#94A3B8]">
                        <span>Convert warm proposals to lock revenue.</span>
                        <button
                            onClick={() => navigate('/quotations')}
                            className="font-bold text-[#FF7A18] hover:text-[#FF923D] flex items-center gap-1 hover:underline cursor-pointer"
                        >
                            Quotation History <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Operational Workspaces: Pending Invoices & Autonomous Agent Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left (2 Spans): Pending Invoice Payments Workspace */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-[#111726] rounded-2xl border border-[#1F2B45] shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-5 border-b border-[#1F2B45] flex items-center justify-between bg-[#172033]">
                            <div className="flex items-center gap-2">
                                <Clock size={18} className="text-[#FF7A18]" />
                                <h3 className="text-base font-bold text-[#F8FAFC]">
                                    Actionable Pending Invoices
                                </h3>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FF7A18]/15 text-[#FF7A18] border border-[#FF7A18]/30">
                                    {unpaidInvoices.length} Pending
                                </span>
                            </div>
                            <button
                                onClick={() => navigate('/invoices')}
                                className="text-xs font-bold text-[#FF7A18] hover:text-[#FF923D] flex items-center gap-1 cursor-pointer"
                            >
                                View All <ArrowRight size={14} />
                            </button>
                        </div>

                        <div className="overflow-x-auto max-h-[420px] custom-scrollbar">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="sticky top-0 bg-[#172033] border-b border-[#1F2B45] z-10">
                                    <tr className="text-xs uppercase tracking-wider text-[#94A3B8]">
                                        <th className="p-3.5 font-semibold">Customer & Invoice</th>
                                        <th className="p-3.5 font-semibold">Due Date</th>
                                        <th className="p-3.5 font-semibold">Amount Due</th>
                                        <th className="p-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F2B45]">
                                    {unpaidInvoices.length > 0 ? (
                                        unpaidInvoices.slice(0, 10).map((inv) => {
                                            const isOverdue = inv.dueDate && isPast(startOfDay(new Date(inv.dueDate)));
                                            const daysLate = inv.dueDate ? differenceInDays(startOfDay(new Date()), startOfDay(new Date(inv.dueDate))) : 0;
                                            const bal = inv.balance ?? (inv.total - (inv.paidAmount || 0));

                                            return (
                                                <tr key={inv._id || inv.id} className="table-record-row hover:bg-[#FFF0E5] dark:hover:bg-[#172033]/60 transition-colors group cursor-pointer">
                                                    <td className="p-3.5">
                                                        <p className="font-bold text-[#F8FAFC]">
                                                            {inv.customerId?.name || inv.customerName}
                                                        </p>
                                                        <p className="text-[11px] font-medium text-[#64748B] mt-0.5">
                                                            {inv.invoiceNumber}
                                                        </p>
                                                    </td>
                                                    <td className="p-3.5">
                                                        {inv.dueDate ? (
                                                            <div>
                                                                <span className={`text-xs font-semibold ${isOverdue ? 'text-[#EF4444]' : 'text-[#F8FAFC]'}`}>
                                                                    {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                                                                </span>
                                                                {isOverdue && (
                                                                    <p className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wide mt-0.5">
                                                                        {daysLate} Days Late
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-[#64748B]">Immediate</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3.5">
                                                        <span className="font-black text-[#F8FAFC] px-2.5 py-1 bg-[#172033] border border-[#1F2B45] rounded-lg text-xs">
                                                            ₹ {Number(bal).toLocaleString('en-IN')}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleShareWhatsApp(inv)}
                                                                className="p-1.5 text-[#22C55E] hover:text-[#22C55E] hover:bg-[#22C55E]/15 rounded-lg border border-[#1F2B45] shadow-sm transition-all cursor-pointer"
                                                                title="Send WhatsApp Payment Reminder"
                                                            >
                                                                <MessageCircle size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setPaymentInvoice(inv);
                                                                    setPaymentAmount(bal);
                                                                    setShowPaymentModal(true);
                                                                }}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#FF7A18]/15 text-[#FF7A18] border border-[#FF7A18]/30 rounded-lg hover:bg-[#FF7A18]/25 transition-colors shadow-sm cursor-pointer"
                                                            >
                                                                <CheckCircle size={14} /> Record Payment
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-10">
                                                <EmptyState
                                                    icon={CheckCircle}
                                                    title="All invoices reconciled"
                                                    description="There are currently zero pending invoice payments. Excellent cash flow!"
                                                    actionText="Create Invoice"
                                                    actionLink="/invoices/new"
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 30-Day Revenue Trend Area Chart */}
                    <div className="bg-[#111726] p-5 rounded-2xl border border-[#1F2B45] shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp size={16} className="text-[#FF7A18]" /> Cashflow Telemetry (Last 30 Days)
                            </h3>
                            <span className="text-xs text-[#94A3B8]">Daily Inflow Trend</span>
                        </div>
                        <div className="h-[210px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="telemetryRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FF7A18" stopOpacity={0.35} />
                                            <stop offset="95%" stopColor="#FF7A18" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <RechartsTooltip
                                        cursor={{ stroke: '#FF7A18', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                                        contentStyle={{
                                            borderRadius: '12px',
                                            backgroundColor: '#111726',
                                            border: '1px solid #1F2B45',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                                            fontSize: '12px',
                                            color: '#F8FAFC'
                                        }}
                                        itemStyle={{ color: '#FF7A18', fontWeight: 600 }}
                                        formatter={(val) => `₹ ${Number(val).toLocaleString('en-IN')}`}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="Revenue"
                                        stroke="#FF7A18"
                                        strokeWidth={2.5}
                                        fillOpacity={1}
                                        fill="url(#telemetryRev)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right (1 Span): Live Autonomous Agent Feed */}
                <div className="space-y-6">
                    <div className="bg-[#111726] p-5 rounded-2xl border border-[#1F2B45] shadow-sm">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1F2B45]">
                            <div className="flex items-center gap-2">
                                <Brain size={18} className="text-[#FF7A18]" />
                                <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                                    Agent Intelligence Feed
                                </h3>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF7A18]/15 text-[#FF7A18] border border-[#FF7A18]/30">
                                Live
                            </span>
                        </div>

                        <div className="space-y-3">
                            {(stats.agentNotifications && stats.agentNotifications.length > 0) ? (
                                stats.agentNotifications.map((notif, idx) => (
                                    <div
                                        key={notif._id || idx}
                                        className="p-3.5 rounded-xl bg-[#172033] border border-[#1F2B45] hover:border-[#FF7A18]/40 transition-colors"
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {getNotificationIcon(notif.type)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-bold text-[#F8FAFC] truncate">
                                                        {notif.title}
                                                    </p>
                                                    <span className="text-[10px] text-[#64748B] flex-shrink-0">
                                                        {notif.createdAt ? format(new Date(notif.createdAt), 'MMM dd') : 'Recent'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                {notif.actionUrl && (
                                                    <button
                                                        onClick={() => navigate(notif.actionUrl)}
                                                        className="text-[10px] font-bold text-[#FF7A18] hover:text-[#FF923D] flex items-center gap-1 mt-2 cursor-pointer"
                                                    >
                                                        Review Action <ExternalLink size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-[#64748B]">
                                    <Brain size={32} className="mx-auto mb-2 opacity-30 text-[#FF7A18]" />
                                    <p className="text-xs font-medium text-[#94A3B8]">All autonomous checks clear</p>
                                    <p className="text-[10px] mt-0.5 text-[#64748B]">Agents running on background schedule</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-[#1F2B45] flex items-center justify-between">
                            <span className="text-[11px] text-[#64748B]">Automated cron intelligence</span>
                            <button
                                onClick={() => navigate('/insights')}
                                className="text-xs font-bold text-[#FF7A18] hover:text-[#FF923D] flex items-center gap-1 cursor-pointer"
                            >
                                Intelligence Center <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Inventory Reorder Status Card */}
                    <div className="bg-[#111726] p-5 rounded-2xl border border-[#1F2B45] shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Package size={18} className="text-[#FF7A18]" />
                                <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                                    Inventory Status
                                </h3>
                            </div>
                            {stats.lowStockCount > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                                    {stats.lowStockCount} Reorders Needed
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                                    Adequate
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-[#94A3B8] mb-4">
                            Monitored by RestockAgent against configured reorder thresholds.
                        </p>
                        <button
                            onClick={() => navigate('/products')}
                            className="w-full py-2.5 px-4 bg-[#172033] hover:bg-[#232328] border border-[#1F2B45] hover:border-[#FF7A18]/50 text-[#F8FAFC] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                            <Package size={14} className="text-[#FF7A18]" /> Inspect Product Catalog
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && paymentInvoice && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form
                        onSubmit={handleRecordPayment}
                        className="bg-[#111726] rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slideDown border border-[#1F2B45]"
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-bold text-[#F8FAFC]">Record Payment</h3>
                            <button
                                type="button"
                                onClick={() => setShowPaymentModal(false)}
                                className="text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-[#94A3B8] mb-5">
                            Record incoming customer settlement for invoice{' '}
                            <strong className="text-[#F8FAFC]">{paymentInvoice.invoiceNumber}</strong>.
                        </p>

                        <div className="bg-[#172033] border border-[#1F2B45] rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[#94A3B8]">Total Billed:</span>
                                <strong className="text-[#F8FAFC]">
                                    ₹ {Number(paymentInvoice.totalAmount || paymentInvoice.total || 0).toLocaleString('en-IN')}
                                </strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#94A3B8]">Previously Paid:</span>
                                <strong className="text-[#22C55E]">
                                    ₹ {Number(paymentInvoice.paidAmount || 0).toLocaleString('en-IN')}
                                </strong>
                            </div>
                            <div className="border-t border-[#1F2B45] my-1 pt-1 flex justify-between font-bold">
                                <span className="text-[#F8FAFC]">Remaining Balance:</span>
                                <strong className="text-[#EF4444]">
                                    ₹ {Number(paymentInvoice.balance).toLocaleString('en-IN')}
                                </strong>
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5 uppercase tracking-wider">
                                Payment Amount (₹)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                max={paymentInvoice.balance}
                                min="1"
                                className="w-full px-3 py-2 bg-[#172033] border border-[#1F2B45] rounded-xl text-sm font-bold text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="Enter amount received"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setShowPaymentModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] rounded-xl cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processingPayment}
                                className="px-4 py-2 text-xs font-bold text-white bg-[#FF7A18] hover:bg-[#FF923D] rounded-xl shadow-md shadow-[#FF7A18]/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <CheckCircle size={14} />
                                {processingPayment ? 'Recording...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
