import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Eye, Trash2, FileText, Loader, Download, Edit, Save, X, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PurchaseOrders = () => {
    const navigate = useNavigate();
    const [pos, setPos] = useState([]);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [includeSeal, setIncludeSeal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [printingId, setPrintingId] = useState(null);
    const [selectedTheme, setSelectedTheme] = useState('indigo');

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editingDateId, setEditingDateId] = useState(null);
    const [editDate, setEditDate] = useState("");
    const [editPoNumber, setEditPoNumber] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPOs = async () => {
            try {
                const response = await api.get('/purchase-orders');
                setPos(response.data);
            } catch (error) {
                console.error("Failed to fetch Purchase Orders", error);
            } finally {
                setLoading(false);
            }
        };
        const fetchDefaultTheme = async () => {
            try {
                const response = await api.get('/settings');
                if (response.data && response.data.defaultTheme) {
                    setSelectedTheme(response.data.defaultTheme);
                }
            } catch (error) {
                console.error('Failed to fetch default theme', error);
            }
        };
        fetchPOs();
        fetchDefaultTheme();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this Purchase Order?")) return;
        try {
            await api.delete(`/purchase-orders/${id}`);
            setPos(pos.filter(po => po._id !== id && po.id !== id));
        } catch (error) {
            console.error("Failed to delete PO", error);
            alert("Failed to delete Purchase Order");
        }
    };

    const handleDownload = async (id, poNumber) => {
        try {
            const response = await api.get(`/purchase-orders/${id}/pdf`, {
                params: { includeSignature, includeSeal, theme: selectedTheme },
                responseType: 'blob', // Important for file download
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `PurchaseOrder_${poNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download PDF");
        }
    };

    const handlePrint = async (id) => {
        try {
            setPrintingId(id);
            const response = await api.get(`/purchase-orders/${id}/pdf`, {
                params: { includeSignature, includeSeal, theme: selectedTheme },
                responseType: 'blob',
            });

            // Check if response is JSON (error)
            if (response.headers['content-type']?.includes('application/json')) {
                const text = await response.data.text();
                const json = JSON.parse(text);
                alert(json.error || "Failed to generate PDF");
                setPrintingId(null);
                return;
            }

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            // Create hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                setTimeout(() => {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    }

                    // Cleanup
                    setTimeout(() => {
                        window.URL.revokeObjectURL(url);
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                        setPrintingId(null);
                    }, 1000);
                }, 200);
            };
        } catch (error) {
            console.error('Failed to print PDF', error);
            alert('Failed to prepare print dialog');
            setPrintingId(null);
        }
    };

    const startEditing = (po) => {
        setEditingId(po._id || po.id);
        setEditPoNumber(po.poNumber);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditPoNumber("");
    };

    const savePoNumber = async () => {
        if (!editPoNumber.trim()) return alert("PO Number cannot be empty");

        setSaving(true);
        try {
            const id = editingId;
            await api.patch(`/purchase-orders/${id}`, { poNumber: editPoNumber });

            // Update UI
            setPos(pos.map(p =>
                (p._id === id || p.id === id) ? { ...p, poNumber: editPoNumber } : p
            ));
            cancelEditing();
        } catch (error) {
            console.error("Update failed", error);
            alert(error.response?.data?.error || "Failed to update PO Number");
        } finally {
            setSaving(false);
        }
    };

    const startEditingDate = (po) => {
        setEditingDateId(po._id || po.id);
        const dateVal = po.date || po.createdAt;
        setEditDate(dateVal ? new Date(dateVal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    };

    const cancelEditingDate = () => {
        setEditingDateId(null);
        setEditDate("");
    };

    const savePoDate = async () => {
        if (!editDate) return alert("Date cannot be empty");
        setSaving(true);
        try {
            await api.patch(`/purchase-orders/${editingDateId}`, { date: editDate });
            setPos(pos.map(p =>
                (p._id === editingDateId || p.id === editingDateId) ? { ...p, date: editDate } : p
            ));
            cancelEditingDate();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update date");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin text-[#FF7A18]" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#F8FAFC]">Purchase Orders</h2>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] bg-[#111726] px-3 py-2 rounded cursor-pointer border hover:bg-[#172033]">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-[#FF7A18] rounded focus:ring-[#FF7A18] border-[#1F2B45]"
                            checked={includeSignature}
                            onChange={e => setIncludeSignature(e.target.checked)}
                        />
                        Include Signature
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] bg-[#111726] px-3 py-2 rounded cursor-pointer border hover:bg-[#172033]">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-[#FF7A18] rounded focus:ring-[#FF7A18] border-[#1F2B45]"
                            checked={includeSeal}
                            onChange={e => setIncludeSeal(e.target.checked)}
                        />
                        Include Seal
                    </label>
                    <select
                        value={selectedTheme}
                        onChange={(e) => setSelectedTheme(e.target.value)}
                        className="text-sm font-medium text-[#F8FAFC] bg-[#111726] px-3 py-2 rounded border hover:bg-[#172033] outline-none cursor-pointer"
                        title="Select PDF Theme"
                    >
                        <option value="indigo">Classic Indigo</option>
                        <option value="emerald">Forest Emerald</option>
                        <option value="crimson">Warm Crimson</option>
                        <option value="charcoal">Sleek Charcoal</option>
                        <option value="plain">Plain Black & White</option>
                    </select>
                    <button
                        onClick={() => navigate('/purchase-orders/new')}
                        className="btn btn-primary"
                    >
                        <Plus size={18} /> Create New PO
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="table-container">
                    <table className="min-w-full divide-y divide-[#1F2B45]">
                        <thead className="bg-[#172033]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">PO Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Supplier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Items</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[#111726] divide-y divide-[#1F2B45]">
                            {pos.map((po) => (
                                <tr key={po._id || po.id} className="table-record-row hover:bg-[#FFF0E5] dark:hover:bg-[#172033] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                                        {editingDateId === (po._id || po.id) ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    className="border border-[#1F2B45] rounded px-2 py-0.5 text-xs focus:ring-[#FF7A18] focus:border-[#FF7A18] bg-[#172033] text-[#F8FAFC]"
                                                    value={editDate}
                                                    onChange={e => setEditDate(e.target.value)}
                                                    autoFocus
                                                />
                                                <button onClick={savePoDate} disabled={saving} className="text-green-600 hover:text-green-800">
                                                    <Save size={14} />
                                                </button>
                                                <button onClick={cancelEditingDate} className="text-[#94A3B8] hover:text-[#F8FAFC]">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 group/date">
                                                {new Date(po.date || po.createdAt).toLocaleDateString()}
                                                <button
                                                    onClick={() => startEditingDate(po)}
                                                    className="opacity-0 group-hover/date:opacity-100 text-[#64748B] hover:text-[#FF7A18] transition-opacity p-1"
                                                    title="Edit Date"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-[#F8FAFC]">
                                        {editingId === (po._id || po.id) ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    className="border rounded px-2 py-1 w-32 text-sm focus:ring-[#FF7A18] focus:border-blue-500"
                                                    value={editPoNumber}
                                                    onChange={e => setEditPoNumber(e.target.value)}
                                                    autoFocus
                                                />
                                                <button onClick={savePoNumber} disabled={saving} className="text-green-600 hover:text-green-800">
                                                    <Save size={16} />
                                                </button>
                                                <button onClick={cancelEditing} className="text-[#94A3B8] hover:text-[#F8FAFC]">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                {po.poNumber}
                                                <button
                                                    onClick={() => startEditing(po)}
                                                    className="opacity-0 group-hover:opacity-100 text-[#64748B] hover:text-[#FF7A18] transition-opacity p-1"
                                                    title="Edit PO Number"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#F8FAFC]">
                                        {po.supplier?.name || po.supplierName || "Unknown Supplier"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#94A3B8]">
                                        {po.items?.length || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-md border 
                                            ${po.status === 'Draft' ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30' :
                                                po.status === 'Sent' ? 'bg-[#FF7A18]/15 text-[#FF7A18] border-[#FF7A18]/30' : 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'}`}>
                                            {po.status || 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            className="text-[#94A3B8] hover:text-[#FF7A18] mr-4 transition-colors"
                                            title="Download PDF"
                                            onClick={() => handleDownload(po._id || po.id, po.poNumber)}
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            className="text-[#94A3B8] hover:text-[#FF7A18] mr-4 transition-colors"
                                            title="Quick Print"
                                            onClick={() => handlePrint(po._id || po.id)}
                                            disabled={printingId === (po._id || po.id)}
                                        >
                                            {printingId === (po._id || po.id) ? <Loader size={18} className="animate-spin" /> : <Printer size={18} />}
                                        </button>
                                        <button
                                            className="text-[#FF7A18] hover:text-[#FF923D] mr-4"
                                            title="View Details"
                                            onClick={() => alert(`PO Details:\nSupplier: ${po.supplier?.name || po.supplierName || 'Unknown'}\nItems: ${po.items?.length}`)}
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            className="text-amber-600 hover:text-amber-900 mr-4"
                                            title="Edit PO Details"
                                            onClick={() => navigate(`/purchase-orders/edit/${po._id || po.id}`)}
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(po._id || po.id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete PO"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {pos.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-10 text-center text-[#94A3B8]">
                                        No purchase orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrders;
