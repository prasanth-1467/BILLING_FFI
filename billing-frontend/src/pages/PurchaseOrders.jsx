import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Plus, Eye, Trash2, FileText, Loader, Download, Edit, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PurchaseOrders = () => {
    const navigate = useNavigate();
    const [pos, setPos] = useState([]);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [loading, setLoading] = useState(true);

    // Editing State
    const [editingId, setEditingId] = useState(null);
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
        fetchPOs();
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
                params: { includeSignature },
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Purchase Orders</h2>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded cursor-pointer border hover:bg-gray-50">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            checked={includeSignature}
                            onChange={e => setIncludeSignature(e.target.checked)}
                        />
                        Include Signature
                    </label>
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
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pos.map((po) => (
                                <tr key={po._id || po.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(po.date || po.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {editingId === (po._id || po.id) ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    className="border rounded px-2 py-1 w-32 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    value={editPoNumber}
                                                    onChange={e => setEditPoNumber(e.target.value)}
                                                    autoFocus
                                                />
                                                <button onClick={savePoNumber} disabled={saving} className="text-green-600 hover:text-green-800">
                                                    <Save size={16} />
                                                </button>
                                                <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                {po.poNumber}
                                                <button
                                                    onClick={() => startEditing(po)}
                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1"
                                                    title="Edit PO Number"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {po.supplier?.name || "Unknown Supplier"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {po.items?.length || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${po.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                                                po.status === 'Sent' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                            {po.status || 'Draft'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            className="text-gray-600 hover:text-gray-900 mr-4"
                                            title="Download PDF"
                                            onClick={() => handleDownload(po._id || po.id, po.poNumber)}
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                            title="View Details"
                                            onClick={() => alert(`PO Details:\nSupplier: ${po.supplier?.name}\nItems: ${po.items?.length}`)}
                                        >
                                            <Eye size={18} />
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
                                    <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
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
