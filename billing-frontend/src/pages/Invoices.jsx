import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Loader, Download, FileText, CheckCircle, Clock, Eye, Trash2, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';

const Invoices = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editNumber, setEditNumber] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await api.get('/invoices');
            setInvoices(response.data);
        } catch (error) {
            console.error('Failed to fetch invoices', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await api.patch(`/invoices/${id}/status`, { status: newStatus });
            setInvoices(invoices.map(inv =>
                inv._id === id || inv.id === id ? { ...inv, status: newStatus } : inv
            ));
        } catch (error) {
            console.error("Failed to update status", error);
            alert(error.response?.data?.error || "Failed to update status");
        }
    };

    const handleDownload = async (id, invoiceNumber) => {
        try {
            setDownloadingId(id);
            const response = await api.get(`/invoices/${id}/pdf`, {
                responseType: 'blob',
            });

            // Check if returned data is JSON (Error) instead of PDF
            if (response.headers['content-type']?.includes('application/json') || response.data.type === 'application/json') {
                const text = await response.data.text();
                try {
                    const json = JSON.parse(text);
                    alert(json.error || "Failed to generate PDF");
                } catch (e) {
                    alert("Failed to generate PDF: Server returned error");
                }
                return;
            }

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download PDF', error);
            // Try to read blob error if available
            if (error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    alert(json.error || "Failed to download PDF");
                } catch (e) {
                    alert("Failed to download PDF");
                }
            } else {
                alert('Failed to download PDF');
            }
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            try {
                await api.delete(`/invoices/${id}`);
                setInvoices(invoices.filter(invoice => (invoice._id || invoice.id) !== id));
            } catch (error) {
                console.error('Failed to delete invoice', error);
                alert('Failed to delete invoice');
            }
        }
    };

    const startEditing = (invoice) => {
        setEditingId(invoice.id);
        setEditNumber(invoice.invoiceNumber);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditNumber("");
    };

    const saveInvoiceNumber = async () => {
        if (!editNumber.trim()) return alert("Invoice number cannot be empty");
        setSaving(true);
        try {
            await api.patch(`/invoices/${editingId}`, { invoiceNumber: editNumber });
            setInvoices(invoices.map(inv =>
                (inv._id === editingId || inv.id === editingId)
                    ? { ...inv, invoiceNumber: editNumber }
                    : inv
            ));
            cancelEditing();
        } catch (error) {
            console.error("Failed to update invoice number", error);
            alert(error.response?.data?.error || "Failed to update invoice number");
        } finally {
            setSaving(false);
        }
    };

    const handleViewPdf = (id) => {
        // Open PDF in a new tab using direct backend URL
        window.open(`http://localhost:5000/api/invoices/${id}/pdf`, '_blank', 'noopener,noreferrer');
    };

    const filteredInvoices = invoices.map(inv => ({
        ...inv,
        // Normalize ids/fields from backend (_id/customerId refs)
        id: inv._id || inv.id,
        customerName: inv.customerId?.name || inv.customerName,
        totalAmount: inv.total ?? inv.totalAmount,
        date: inv.date
    })).filter(inv =>
        (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <Loader className="animate-spin mr-2" /> Loading Invoices...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search invoice number or customer..."
                        className="pl-10 w-full h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="font-medium text-blue-600">
                                            {editingId === invoice.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        className="border rounded px-2 py-1 w-32 text-sm"
                                                        value={editNumber}
                                                        onChange={e => setEditNumber(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={saveInvoiceNumber} disabled={saving} className="text-green-600 hover:text-green-800">
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group">
                                                    <FileText size={16} />
                                                    {invoice.invoiceNumber}
                                                    <button
                                                        onClick={() => startEditing(invoice)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1"
                                                        title="Edit Invoice Number"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td>{invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : 'N/A'}</td>
                                        <td className="font-medium">{invoice.customerName}</td>
                                        <td className="font-bold text-gray-900">₹ {invoice.totalAmount?.toFixed(2)}</td>
                                        <td>
                                            <select
                                                value={invoice.status || (invoice.balance <= 0 ? "Paid" : "Pending")}
                                                onChange={(e) => handleStatusUpdate(invoice.id, e.target.value)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border-none outline-none cursor-pointer appearance-none ${(invoice.status === 'Paid' || (!invoice.status && invoice.balance <= 0))
                                                    ? 'bg-green-100 text-green-800'
                                                    : invoice.status === 'Cancelled'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                <option value="Pending">Pending</option>
                                                <option value="Paid">Paid</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleViewPdf(invoice.id)}
                                                className="btn btn-outline text-sm py-1 px-3 mr-2"
                                            >
                                                <Eye size={16} /> View
                                            </button>
                                            <button
                                                onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                                                disabled={downloadingId === invoice.id}
                                                className="btn btn-outline text-sm py-1 px-3"
                                            >
                                                {downloadingId === invoice.id ? (
                                                    <Loader size={16} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <Download size={16} /> PDF
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(invoice.id)}
                                                className="btn btn-outline text-red-600 hover:bg-red-50 text-sm py-1 px-3"
                                            >
                                                <Trash2 size={16} /> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                        No invoices found.
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

export default Invoices;
