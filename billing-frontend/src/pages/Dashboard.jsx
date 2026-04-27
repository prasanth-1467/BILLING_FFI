import React, { useEffect, useState } from 'react';
import { 
    TrendingUp, 
    AlertTriangle, 
    Clock, 
    FileText, 
    Loader, 
    Plus, 
    Users, 
    MessageCircle, 
    CheckCircle, 
    X,
    IndianRupee,
    ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format, differenceInDays, isPast, startOfDay, subDays } from 'date-fns';

const Dashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        invoices: [],
        customers: [],
        chartData: [],
        topCustomers: [],
        pendingAmount: 0,
        overdueAmount: 0,
        overdueCount: 0,
        dueTodayCount: 0
    });

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    const fetchData = async () => {
        try {
            const [invRes, custRes] = await Promise.all([
                api.get('/invoices'),
                api.get('/customers')
            ]);
            
            const invoices = invRes.data || [];
            const customers = custRes.data || [];
            const today = startOfDay(new Date());

            // 1. Core Financial Aggregations
            let pendingAmount = 0;
            let overdueAmount = 0;
            let overdueCount = 0;
            let dueTodayCount = 0;

            const customerRevenue = {};

            invoices.forEach(inv => {
                const bal = inv.balance ?? (inv.total - (inv.paidAmount || 0));
                
                // Aggregating Top Customers
                const custName = inv.customerId?.name || inv.customerName || 'Unknown';
                if (!customerRevenue[custName]) customerRevenue[custName] = 0;
                customerRevenue[custName] += (inv.total || 0);

                if (bal > 0) {
                    pendingAmount += bal;
                    if (inv.dueDate) {
                        const dueDate = startOfDay(new Date(inv.dueDate));
                        if (isPast(dueDate)) {
                            overdueAmount += bal;
                            overdueCount++;
                        } else if (dueDate.getTime() === today.getTime()) {
                            dueTodayCount++;
                        }
                    }
                }
            });

            // 2. Top Customers Sorting
            const topCustomers = Object.entries(customerRevenue)
                .map(([name, total]) => ({ name, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);

            // 3. 30-Day Activity Chart Generation
            const chartData = [];
            for (let i = 29; i >= 0; i--) {
                const targetDay = subDays(today, i);
                const dayStr = format(targetDay, 'MMM dd');
                
                const dayInvoices = invoices.filter(inv => {
                    if(!inv.date) return false;
                    return startOfDay(new Date(inv.date)).getTime() === targetDay.getTime();
                });
                
                const dayRevenue = dayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
                chartData.push({ date: dayStr, Revenue: dayRevenue });
            }

            setData({
                invoices,
                customers,
                chartData,
                topCustomers,
                pendingAmount,
                overdueAmount,
                overdueCount,
                dueTodayCount
            });
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        setProcessingPayment(true);
        try {
            await api.patch(`/invoices/${paymentInvoice._id || paymentInvoice.id}/payment`, { amount: Number(paymentAmount) });
            setShowPaymentModal(false);
            setPaymentInvoice(null);
            setPaymentAmount('');
            fetchData(); // Refresh all stats
        } catch (error) {
            alert(error.response?.data?.error || "Failed to record payment");
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleShareWhatsApp = (invoice) => {
        const phone = invoice.customerId?.phone;
        if (!phone) {
             alert('Customer does not have a phone number saved.');
             return;
        }
        const text = `Hello ${invoice.customerName},\n\nThis is a friendly reminder regarding Invoice *${invoice.invoiceNumber}* for *₹${Number(invoice.total || 0).toLocaleString('en-IN')}*.\nThe pending balance of *₹${Number(invoice.balance).toLocaleString('en-IN')}* was due on ${invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'Immediate'}.\n\nPlease arrange for payment at your earliest convenience.\n\nThank you!`;
        const wsUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
        window.open(wsUrl, '_blank');
    };

    // Filter unpaid invoices and sort by oldest due date
    const unpaidInvoices = data.invoices
        .filter(inv => (inv.balance ?? (inv.total - (inv.paidAmount || 0))) > 0)
        .sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[80vh] text-blue-500">
                <Loader className="animate-spin w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn pb-10">
            {/* Top Quick Actions & Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* 1. Quick Actions Ribbon (Takes up 1 column but stacks nicely on mobile) */}
                <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Quick Actions</h3>
                    <button onClick={() => navigate('/quotation')} className="flex items-center justify-between p-3.5 rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 transition font-medium group">
                        <span className="flex items-center gap-2"><FileText size={18} /> New Quotation</span>
                        <Plus size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button onClick={() => navigate('/invoices')} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm hover:border-blue-300 hover:text-blue-600 transition font-medium group">
                        <span className="flex items-center gap-2"><FileText size={18} /> Open Invoices</span>
                        <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button onClick={() => navigate('/customers')} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm hover:border-blue-300 hover:text-blue-600 transition font-medium group">
                        <span className="flex items-center gap-2"><Users size={18} /> Manage Customers</span>
                        <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                {/* 2. Financial Summaries */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 align-start">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex flex-col justify-between hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-2">
                            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
                                <Clock size={24} />
                            </div>
                            <span className="px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-600 rounded-lg">Active Pipeline</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Total Pending Payment</p>
                            <h3 className="text-3xl font-black text-gray-900">₹ {data.pendingAmount.toLocaleString('en-IN', {minimumFractionDigits:0})}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 flex flex-col justify-between hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-2">
                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {data.overdueCount > 0 && <span className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-lg animate-pulse">{data.overdueCount} Alerts</span>}
                                {data.dueTodayCount > 0 && <span className="px-2.5 py-1 text-xs font-bold bg-orange-100 text-orange-700 rounded-lg">{data.dueTodayCount} Due Today</span>}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Critical Overdue Amount</p>
                            <h3 className="text-3xl font-black text-red-600">₹ {data.overdueAmount.toLocaleString('en-IN', {minimumFractionDigits:0})}</h3>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-900 to-gray-900 p-6 rounded-2xl shadow-lg border border-gray-800 text-white flex flex-col justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-blue-400 border border-white/10">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-1">Total All-Time Revenue</p>
                                <h3 className="text-3xl font-black text-white">₹ {data.invoices.reduce((s,i) => s + (i.total||0), 0).toLocaleString('en-IN', {minimumFractionDigits:0})}</h3>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-600/30 rounded-full blur-3xl" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Pending Payments Table Area */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Clock size={20} className="text-orange-500" /> Pending Invoice Payments Workspace
                            </h3>
                        </div>
                        <div className="overflow-x-auto max-h-[400px]">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 shadow-sm z-10">
                                    <tr className="text-xs uppercase tracking-wider text-gray-500">
                                        <th className="p-4 font-semibold">Customer & Invoice</th>
                                        <th className="p-4 font-semibold">Due Date</th>
                                        <th className="p-4 font-semibold">Amount Due</th>
                                        <th className="p-4 font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {unpaidInvoices.length > 0 ? (
                                        unpaidInvoices.map((inv) => {
                                            const isOverdue = inv.dueDate && isPast(startOfDay(new Date(inv.dueDate)));
                                            const daysLate = inv.dueDate ? differenceInDays(startOfDay(new Date()), startOfDay(new Date(inv.dueDate))) : 0;
                                            
                                            return (
                                                <tr key={inv._id || inv.id} className="hover:bg-blue-50/20 transition-colors group">
                                                    <td className="p-4">
                                                        <p className="font-bold text-gray-900">{inv.customerId?.name || inv.customerName}</p>
                                                        <p className="text-[11px] font-medium text-gray-400 mt-0.5">{inv.invoiceNumber}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        {inv.dueDate ? (
                                                            <div>
                                                                <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                                                                    {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                                                                </span>
                                                                {isOverdue && <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mt-0.5">{daysLate} Days Late</p>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">Immediate</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="font-bold text-gray-900 p-1.5 bg-gray-100 rounded-md">₹ {inv.balance.toLocaleString('en-IN')}</span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => handleShareWhatsApp(inv)}
                                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-white border border-gray-200 shadow-sm tooltip transition-all"
                                                                title="Send WhatsApp Reminder"
                                                            >
                                                                <MessageCircle size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { setPaymentInvoice(inv); setPaymentAmount(inv.balance); setShowPaymentModal(true); }}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors shadow-sm"
                                                            >
                                                                <CheckCircle size={14}/> Mark Paid
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center">
                                                    <CheckCircle size={40} className="mb-3 text-gray-200" />
                                                    <p className="font-medium">All invoices are paid</p>
                                                    <p className="text-xs mt-1">Excellent cash flow management!</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Charts & Top Customers */}
                <div className="space-y-6">
                    
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                           <TrendingUp size={16} className="text-blue-500" /> Revenue (Last 30 Days)
                        </h3>
                        <div className="h-[200px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <RechartsTooltip cursor={{stroke: '#93C5FD', strokeWidth: 1}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px'}} formatter={(val) => `₹ ${val.toLocaleString('en-IN')}`} />
                                    <Area type="monotone" dataKey="Revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                           <Users size={16} className="text-purple-500" /> Top Customers Leaderboard
                        </h3>
                        <div className="space-y-3">
                            {data.topCustomers.length > 0 ? (
                                data.topCustomers.map((cust, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                                #{idx + 1}
                                            </div>
                                            <span className="font-bold text-gray-700 text-sm">{cust.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900 text-sm">₹ {(cust.total/1000).toFixed(1)}k</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-4">No customer data available yet.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Native Dashboard Payment Modal */}
            {showPaymentModal && paymentInvoice && (
               <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                  <form onSubmit={handleRecordPayment} className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-slideDown">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Record Fast Payment</h3>
                        <button type="button" onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                     </div>
                     <p className="text-sm text-gray-500 mb-6">Processing collection for invoice <strong className="text-gray-800">{paymentInvoice.invoiceNumber}</strong>.</p>
                     
                     <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2 text-sm border border-gray-100">
                        <div className="border-b border-gray-200 pb-2 flex justify-between"><span className="text-gray-500">Total Billed:</span> <strong className="text-gray-900">₹ {(paymentInvoice.total||0).toLocaleString('en-IN')}</strong></div>
                        <div className="flex justify-between"><span className="font-bold text-gray-700">Pending Balance:</span> <strong className="text-red-600">₹ {(paymentInvoice.balance).toLocaleString('en-IN')}</strong></div>
                     </div>

                     <div className="mb-5">
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Collection Amount</label>
                       <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 text-gray-400" size={16} />
                          <input 
                             type="number"
                             step="0.01"
                             required
                             max={paymentInvoice.balance}
                             className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                             value={paymentAmount}
                             onChange={e => setPaymentAmount(e.target.value)}
                          />
                       </div>
                     </div>

                     <button type="submit" disabled={processingPayment} className="w-full btn btn-primary flex justify-center py-2.5 shadow-md">
                        {processingPayment ? <Loader className="animate-spin" size={20}/> : <span className="flex items-center gap-2"><CheckCircle size={18}/> Process Payment</span>}
                     </button>
                  </form>
               </div>
            )}
        </div>
    );
};

export default Dashboard;
