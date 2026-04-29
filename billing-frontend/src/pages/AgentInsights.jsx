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
                if(qty > maxSales) { maxSales = qty; topProduct = name; }
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
                if(bal > 0 && inv.dueDate && isPast(startOfDay(new Date(inv.dueDate)))) {
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

    const MetricCard = ({ title, value, subtitle, icon, type = "blue" }) => {
        const colors = {
            blue: "bg-blue-50 text-blue-600 border-blue-100",
            emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
            orange: "bg-orange-50 text-orange-600 border-orange-100",
            purple: "bg-purple-50 text-purple-600 border-purple-100",
        };

        return (
            <div className={`p-5 rounded-2xl border transition-shadow hover:shadow-md bg-white flex flex-col justify-between`}>
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors[type]}`}>
                        {icon}
                    </div>
                </div>
                <div>
                    <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>
                    <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                    {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                       <Activity className="text-blue-500" /> Business Insights
                    </h1>
                    <p className="text-gray-500">Live analytics and actionable recommendations based on your billing workflow.</p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-gray-700 font-medium"
                    title="Refresh Insights"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Sync Data
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-blue-500">
                    <Loader className="animate-spin w-10 h-10" />
                </div>
            ) : (
                <>
                    {/* Insights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard 
                           title="Monthly Revenue" 
                           value={`₹ ${metrics.monthlyRevenue.toLocaleString('en-IN', {minimumFractionDigits:0, maximumFractionDigits:0})}`} 
                           subtitle="Total billed in current month"
                           icon={<TrendingUp size={24} />} 
                           type="emerald"
                        />
                        <MetricCard 
                           title="Pending Receivables" 
                           value={`₹ ${metrics.pendingInvoicesAmount.toLocaleString('en-IN', {minimumFractionDigits:0, maximumFractionDigits:0})}`} 
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
                           type="blue"
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Charts Area */}
                        <div className="xl:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                   <BarChart3 size={20} className="text-gray-400" /> Revenue vs Collected (6 Months)
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} tickFormatter={(val) => `₹${val/1000}k`} />
                                            <RechartsTooltip cursor={{fill: '#F3F4F6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(val) => `₹ ${val.toLocaleString('en-IN')}`} />
                                            <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}}/>
                                            <Bar dataKey="Revenue" fill="#93C5FD" radius={[4, 4, 0, 0]} name="Total Billed" />
                                            <Bar dataKey="Collected" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Actually Collected" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                   <Activity size={20} className="text-gray-400" /> Invoice Volume Trend
                                </h3>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <defs>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                            <Area type="monotone" dataKey="SalesCount" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" name="Invoices Generated" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Alerts & Recommendations */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <AlertCircle size={20} className="text-gray-400" /> Action Required
                                </h3>
                                
                                <div className="space-y-3">
                                    {metrics.overdueCount > 0 ? (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 items-start">
                                            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-red-800">You have {metrics.overdueCount} overdue invoice(s)</p>
                                                <p className="text-xs text-red-600 mt-1">Follow up with clients to maintain cash flow.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex gap-3 items-start opacity-70">
                                            <CheckCircle2 size={18} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-600">No overdue invoices</p>
                                            </div>
                                        </div>
                                    )}

                                    {metrics.lowStockCount > 0 ? (
                                        <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg flex gap-3 items-start">
                                            <TrendingDown size={18} className="text-orange-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-orange-800">{metrics.lowStockCount} products are low on stock</p>
                                                <p className="text-xs text-orange-600 mt-1">
                                                    Consider restocking: {metrics.lowStockProducts.map(p => p.name).join(', ')} 
                                                    {metrics.lowStockCount > 3 ? '...' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex gap-3 items-start opacity-70">
                                            <CheckCircle2 size={18} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-600">Inventory is healthy</p>
                                            </div>
                                        </div>
                                    )}

                                    {metrics.pendingQuotesCount > 0 ? (
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 items-start">
                                            <FileText size={18} className="text-blue-500 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-blue-800">{metrics.pendingQuotesCount} pending quotations</p>
                                                <p className="text-xs text-blue-600 mt-1">Follow up and convert them to invoices!</p>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-900 to-gray-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-blue-400 mb-4">
                                        <Lightbulb size={20} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Recommended Actions</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-3 leading-snug">
                                        Boost your collection speed.
                                    </h3>
                                    <ul className="text-gray-300 text-sm space-y-2 mb-5 list-disc pl-4">
                                        {metrics.pendingQuotesCount > 0 && <li>Convert your open quotations into invoices today.</li>}
                                        {metrics.overdueCount > 0 && <li>Use the WhatsApp Share feature in Invoices to remind customers of overdue payments.</li>}
                                        {metrics.lowStockCount > 0 && <li>Use the Purchase Orders module to restock immediately.</li>}
                                        {metrics.pendingQuotesCount === 0 && metrics.overdueCount === 0 && metrics.lowStockCount === 0 && <li>Everything looks great! Keep up the good work.</li>}
                                    </ul>
                                    <div className="flex gap-4">
                                        <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded text-[10px] border border-white/5 uppercase tracking-wide font-bold text-gray-400">
                                            More insights coming soon
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl" />
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
        <div className="p-10 text-red-600 font-mono whitespace-pre-wrap">
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
