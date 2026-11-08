import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    AlertCircle,
    ShoppingBag,
    BarChart3,
    Clock,
    FileText,
    ArrowRight,
    RefreshCw,
    Lightbulb,
    IndianRupee,
    TrendingDown,
    Activity,
    Loader,
    CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { format, subMonths, isSameMonth, isPast, startOfDay, parseISO } from 'date-fns';

const AgentInsights = () => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        topProduct: null,
        lowStockCount: 0,
        monthlyRevenue: 0,
        pendingInvoicesAmount: 0,
        overdueCount: 0,
        pendingQuotesCount: 0,
        lowStockProducts: []
    });

    const [chartData, setChartData] = useState([]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [productsRes, invoicesRes, quotesRes] = await Promise.all([
                api.get('/products'),
                api.get('/invoices'),
                api.get('/quotations')
            ]);

            const products = productsRes.data || [];
            const invoices = invoicesRes.data || [];
            const quotes = quotesRes.data || [];

            const now = new Date();

            // --- 1. Top Selling Product (All time approximation) ---
            const productSales = {};
            invoices.forEach(inv => {
                (inv.items || []).forEach(item => {
                    const pId = typeof item.productId === 'object' ? item.productId?._id : item.productId;
                    let name = item.name || item.productId?.name;
                    if (!name && pId) {
                        const foundProduct = products.find(p => p._id === pId || p.id === pId);
                        if (foundProduct) name = foundProduct.name;
                    }
                    name = name || 'Unknown';
                    if (!productSales[name]) productSales[name] = 0;
                    productSales[name] += item.qty || 0;
                });
            });
            let topProduct = null;
            let maxSales = 0;
            Object.entries(productSales).forEach(([name, qty]) => {
                if (qty > maxSales) { maxSales = qty; topProduct = name; }
            });

            // --- 2. Low Stock Count ---
            const lowStockProducts = products.filter(p => (p.stockQty || 0) <= (p.reorderLevel || 5));

            // --- 3. Monthly Revenue ---
            const currentMonthInvoices = invoices.filter(inv => inv.date && isSameMonth(new Date(inv.date), now));
            const monthlyRevenue = currentMonthInvoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || 0), 0);

            // --- 4. Pending Invoices ---
            const pendingInvoicesAmount = invoices.reduce((sum, inv) => {
                const bal = inv.balance ?? (inv.total - (inv.paidAmount || 0));
                return sum + (bal > 0 ? bal : 0);
            }, 0);

            // --- 5. Alerts Data ---
            let overdueCount = 0;
            invoices.forEach(inv => {
                const bal = inv.balance ?? (inv.total - (inv.paidAmount || 0));
                if (bal > 0 && inv.dueDate && isPast(startOfDay(new Date(inv.dueDate)))) {
                    overdueCount++;
                }
            });

            const pendingQuotesCount = quotes.filter(q => q.status === 'Draft' || q.status === 'Sent' || !q.status).length;

            setMetrics({
                topProduct: topProduct ? `${topProduct} (${maxSales} sold)` : 'No Data',
                lowStockCount: lowStockProducts.length,
                monthlyRevenue,
                pendingInvoicesAmount,
                overdueCount,
                pendingQuotesCount,
                lowStockProducts: lowStockProducts.slice(0, 3) // Preview up to 3
            });

            // --- 6. Chart Data Preparation (Last 6 Months) ---
            const historicalData = [];
            for (let i = 5; i >= 0; i--) {
                const targetMonth = subMonths(now, i);
                const monthName = format(targetMonth, 'MMM yyyy');

                const monthInvoices = invoices.filter(inv => inv.date && isSameMonth(new Date(inv.date), targetMonth));

                const monthRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.total || inv.totalAmount || 0), 0);
                const monthCollection = monthInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

                historicalData.push({
                    name: monthName,
                    Revenue: monthRevenue,
                    Collected: monthCollection,
                    SalesCount: monthInvoices.length
                });
            }
            setChartData(historicalData);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            alert('Failed to load dashboard insights.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const MetricCard = ({ title, value, subtitle, icon, type = "orange" }) => {
        const colors = {
            emerald: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30",
            orange: "bg-[#FF7A18]/10 text-[#FF7A18] border-[#FF7A18]/30",
            blue: "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
            amber: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
            purple: "bg-[#FF7A18]/10 text-[#FF7A18] border-[#FF7A18]/30",
        };

        return (
            <div className="p-5 rounded-2xl border border-[#1F2B45] bg-[#111726] transition-all hover:border-[#FF7A18]/50 hover:shadow-lg hover:shadow-black/40 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${colors[type] || colors.orange}`}>
                        {icon}
                    </div>
                </div>
                <div>
                    <h3 className="text-[#94A3B8] text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
                    <p className="text-2xl font-black text-[#F8FAFC] leading-tight">{value}</p>
                    {subtitle && <p className="text-xs text-[#94A3B8] mt-2 font-medium">{subtitle}</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight mb-2 flex items-center gap-3">
                        <Activity className="text-[#FF7A18]" size={28} /> Business Insights
                    </h1>
                    <p className="text-[#94A3B8] text-xs sm:text-sm">Live analytics and actionable recommendations based on your billing workflow.</p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className="flex items-center gap-2 px-4 py-2 bg-[#111726] border border-[#1F2B45] rounded-xl hover:bg-[#172033] hover:border-[#FF7A18]/40 transition-colors shadow-sm text-[#F8FAFC] font-bold text-xs cursor-pointer"
                    title="Refresh Insights"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin text-[#FF7A18]' : 'text-[#FF7A18]'} />
                    Sync Data
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-[#FF7A18]">
                    <Loader className="animate-spin w-10 h-10" />
                </div>
            ) : (
                <>
                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Monthly Revenue"
                            value={`₹ ${metrics.monthlyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            subtitle="Total billed in current month"
                            icon={<TrendingUp size={24} />}
                            type="emerald"
                        />
                        <MetricCard
                            title="Pending Receivables"
                            value={`₹ ${metrics.pendingInvoicesAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            subtitle="Outstanding balance across all invoices"
                            icon={<IndianRupee size={24} />}
                            type="orange"
                        />
                        <MetricCard
                            title="Top Selling Product"
                            value={metrics.topProduct || 'N/A'}
                            subtitle="Highest volume item in invoices"
                            icon={<ShoppingBag size={24} />}
                            type="purple"
                        />
                        <MetricCard
                            title="Low Stock Warning"
                            value={`${metrics.lowStockCount} Products`}
                            subtitle="Inventory below reorder thresholds"
                            icon={<TrendingDown size={24} />}
                            type="amber"
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Charts Area */}
                        <div className="xl:col-span-2 space-y-6">
                            <div className="bg-[#111726] p-6 rounded-2xl border border-[#1F2B45] shadow-sm">
                                <h3 className="text-base font-bold text-[#F8FAFC] mb-6 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-[#FF7A18]" /> Revenue vs Collected (6 Months)
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2B45" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(255, 122, 24, 0.05)' }}
                                                contentStyle={{ backgroundColor: '#111726', border: '1px solid #1F2B45', borderRadius: '12px', color: '#F8FAFC' }}
                                                formatter={(val) => [`₹ ${val.toLocaleString('en-IN')}`, '']}
                                            />
                                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', color: '#94A3B8', fontSize: '12px' }} />
                                            <Bar dataKey="Revenue" fill="#FF7A18" radius={[4, 4, 0, 0]} name="Total Billed" />
                                            <Bar dataKey="Collected" fill="#6366F1" radius={[4, 4, 0, 0]} name="Actually Collected" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-[#111726] p-6 rounded-2xl border border-[#1F2B45] shadow-sm">
                                <h3 className="text-base font-bold text-[#F8FAFC] mb-6 flex items-center gap-2">
                                    <Activity size={18} className="text-[#FF7A18]" /> Invoice Volume Trend
                                </h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#FF7A18" stopOpacity={0.35} />
                                                    <stop offset="95%" stopColor="#FF7A18" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2B45" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#111726', border: '1px solid #1F2B45', borderRadius: '12px', color: '#F8FAFC' }} />
                                            <Area type="monotone" dataKey="SalesCount" stroke="#FF7A18" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" name="Invoices Generated" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Alerts & Recommendations */}
                        <div className="space-y-6">
                            <div className="bg-[#111726] p-6 rounded-2xl border border-[#1F2B45] shadow-sm">
                                <h3 className="text-base font-bold text-[#F8FAFC] mb-4 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-[#FF7A18]" /> Action Required
                                </h3>

                                <div className="space-y-3">
                                    {metrics.overdueCount > 0 ? (
                                        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl flex gap-3 items-start">
                                            <AlertCircle size={18} className="text-[#EF4444] mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-[#EF4444]">You have {metrics.overdueCount} overdue invoice(s)</p>
                                                <p className="text-xs text-[#94A3B8] mt-1">Follow up with clients to maintain cash flow.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-[#0B0F19] border border-[#1F2B45] rounded-xl flex gap-3 items-start opacity-70">
                                            <CheckCircle2 size={18} className="text-[#22C55E] mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-[#94A3B8]">No overdue invoices</p>
                                            </div>
                                        </div>
                                    )}

                                    {metrics.lowStockCount > 0 ? (
                                        <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl flex gap-3 items-start">
                                            <TrendingDown size={18} className="text-[#F59E0B] mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-[#F59E0B]">{metrics.lowStockCount} products are low on stock</p>
                                                <p className="text-xs text-[#94A3B8] mt-1">
                                                    Consider restocking: {metrics.lowStockProducts.map(p => p.name).join(', ')}
                                                    {metrics.lowStockCount > 3 ? '...' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-[#0B0F19] border border-[#1F2B45] rounded-xl flex gap-3 items-start opacity-70">
                                            <CheckCircle2 size={18} className="text-[#22C55E] mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-[#94A3B8]">Inventory is healthy</p>
                                            </div>
                                        </div>
                                    )}

                                    {metrics.pendingQuotesCount > 0 ? (
                                        <div className="p-3 bg-[#FF7A18]/10 border border-[#FF7A18]/30 rounded-xl flex gap-3 items-start">
                                            <FileText size={18} className="text-[#FF7A18] mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-[#FF7A18]">{metrics.pendingQuotesCount} pending quotations</p>
                                                <p className="text-xs text-[#94A3B8] mt-1">Follow up and convert them to invoices!</p>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="bg-[var(--card-bg)] border border-[#FF7A18]/30 rounded-2xl p-6 text-[var(--text-primary)] relative overflow-hidden shadow-xl">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-[#FF7A18] mb-4">
                                        <Lightbulb size={20} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Recommended Actions</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-3 leading-snug text-[#F8FAFC]">
                                        Boost your collection speed.
                                    </h3>
                                    <ul className="text-[#94A3B8] text-sm space-y-2 mb-5 list-disc pl-4">
                                        {metrics.pendingQuotesCount > 0 && <li>Convert your open quotations into invoices today.</li>}
                                        {metrics.overdueCount > 0 && <li>Use the WhatsApp Share feature in Invoices to remind customers of overdue payments.</li>}
                                        {metrics.lowStockCount > 0 && <li>Use the Purchase Orders module to restock immediately.</li>}
                                        {metrics.pendingQuotesCount === 0 && metrics.overdueCount === 0 && metrics.lowStockCount === 0 && <li>Everything looks great! Keep up the good work.</li>}
                                    </ul>
                                    <div className="flex gap-4">
                                        <div className="bg-[#0B0F19] px-3 py-1.5 rounded-lg text-[10px] border border-[#1F2B45] uppercase tracking-wide font-bold text-[#FF7A18]">
                                            More insights coming soon
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-[#FF7A18]/10 rounded-full blur-3xl pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("ErrorBoundary caught an error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 text-[#EF4444] font-mono whitespace-pre-wrap">
                    <h1 className="text-2xl font-bold mb-4">React Render Crash</h1>
                    <p>{this.state.error && this.state.error.toString()}</p>
                    <pre className="text-xs mt-4">{this.state.error && this.state.error.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function AgentInsightsWrapper() {
    return (
        <ErrorBoundary>
            <AgentInsights />
        </ErrorBoundary>
    );
}
