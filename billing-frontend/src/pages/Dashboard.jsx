import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Package, FileText, Loader } from 'lucide-react';
import api from '../services/api';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
        </div>
        {/* Trend placeholder - in future can be calculated */}
        {trend && (
            <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 font-medium flex items-center gap-1">
                    <TrendingUp size={16} />
                    {trend}
                </span>
                <span className="text-gray-400 ml-2">vs last month</span>
            </div>
        )}
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalSales: 0,
        totalInvoices: 0,
        totalCustomers: 0,
        lowStockCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/stats');
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <Loader className="animate-spin mr-2" /> Loading Dashboard...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Sales"
                    value={`₹ ${stats.totalSales.toFixed(2)}`}
                    icon={TrendingUp}
                    color="bg-blue-500"
                // trend="+12.5%" 
                />
                <StatCard
                    title="Total Invoices"
                    value={stats.totalInvoices}
                    icon={FileText}
                    color="bg-purple-500"
                // trend="+5%"
                />
                <StatCard
                    title="Total Customers"
                    value={stats.totalCustomers}
                    icon={Users}
                    color="bg-orange-500"
                // trend="+22%"
                />
                <StatCard
                    title="Products Low Stock"
                    value={stats.lowStockCount}
                    icon={Package}
                    color="bg-red-500"
                // trend="-2%"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col justify-center items-center text-gray-400">
                    <p>Sales Chart Placeholder</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col justify-center items-center text-gray-400">
                    <p>Recent Activity Placeholder</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
