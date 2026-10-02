import React, { useState, useEffect, useMemo } from 'react';
import { generateEWayBillJSON, downloadEWayBillJSON } from '../utils/ewayBillFormatter';
import api from '../services/api';
import { Truck, CheckCircle, AlertTriangle, Download, Copy, FileText, ArrowLeft, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EWayBillSandbox = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        invoiceNumber: 'FFI/25-26/089',
        date: new Date().toISOString().substring(0, 10),
        customerName: 'Green Agri Farms Ltd',
        customerGSTIN: '33ABCDE1234F1Z5',
        customerState: 'Tamil Nadu',
        vehicleNo: 'TN38AB1234',
        toPincode: 641001,
        toPlace: 'Coimbatore',
        items: [
            {
                name: '2" Automatic Backwash Filter',
                hsn: '8424',
                qty: 10,
                rate: 4500,
                gstRate: 18,
                unit: 'NOS'
            }
        ]
    });

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const res = await api.get('/invoices');
                setInvoices(res.data || []);
            } catch (err) {
                console.error("Failed to load invoices for sandbox:", err);
            } finally {
                setLoadingInvoices(false);
            }
        };
        fetchInvoices();
    }, []);

    const handleSelectInvoice = (e) => {
        const id = e.target.value;
        setSelectedInvoiceId(id);
        if (!id) return;

        const inv = invoices.find(i => (i._id || i.id) === id);
        if (!inv) return;

        setFormData(prev => ({
            invoiceNumber: inv.invoiceNumber || '',
            date: inv.date ? inv.date.substring(0, 10) : new Date().toISOString().substring(0, 10),
            customerName: inv.customerName || inv.customerId?.name || 'Customer',
            customerGSTIN: inv.customerGSTIN || inv.customerId?.gstNumber || 'URP',
            customerState: inv.customerState || inv.customerId?.state || 'Tamil Nadu',
            vehicleNo: prev.vehicleNo || 'TN38AB1234',
            toPincode: Number(prev.toPincode) || 641001,
            toPlace: prev.toPlace || inv.customerState || 'Coimbatore',
            items: (inv.items || []).map(item => ({
                name: item.name || item.productId?.name || 'Product',
                hsn: item.hsn || item.productId?.hsn || '8424',
                qty: Number(item.qty || 1),
                rate: Number(item.rate || 0),
                gstRate: Number(item.gstRate || 0),
                unit: item.unit || item.productId?.unit || 'NOS'
            }))
        }));
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Derived E-Way Bill JSON and Validation Result
    const validationResult = useMemo(() => {
        try {
            const json = generateEWayBillJSON({
                ...formData,
                toPincode: Number(formData.toPincode) || 641001,
                transDistance: 0
            });
            return {
                passed: true,
                json,
                error: null
            };
        } catch (err) {
            return {
                passed: false,
                json: null,
                error: err.message
            };
        }
    }, [formData]);

    const handleCopyPayload = () => {
        if (!validationResult.json) return;
        navigator.clipboard.writeText(JSON.stringify(validationResult.json, null, 2)).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const handleDownload = () => {
        try {
            downloadEWayBillJSON({
                ...formData,
                toPincode: Number(formData.toPincode) || 641001,
                transDistance: 0
            });
        } catch (err) {
            alert("Download failed: " + err.message);
        }
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f172a] text-white p-6 rounded-2xl shadow-xl border border-slate-800">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <Truck size={28} className="text-indigo-400" />
                        <span>E-Way Bill Formatter Sandbox</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Verify NIC GST compliance formatting, threshold validation rules, and export official E-Way Bill JSON files.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/')}
                        className="btn btn-outline bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 text-xs rounded-xl"
                    >
                        <ArrowLeft size={14} /> Back to Dashboard
                    </button>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold">
                        GST Schema v1.0.0621
                    </span>
                </div>
            </div>

            {/* Main Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Form Controls */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                            Invoice & Transport Parameters
                        </h2>

                        {/* Existing Invoices Picker */}
                        <div>
                            <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1.5 flex justify-between">
                                <span>Import from Existing Invoices</span>
                                {loadingInvoices && <span className="text-slate-400 text-[10px]">Loading...</span>}
                            </label>
                            <select
                                value={selectedInvoiceId}
                                onChange={handleSelectInvoice}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            >
                                <option value="">-- Choose an Invoice to Auto-Fill --</option>
                                {invoices.map(inv => {
                                    const custName = inv.customerName || inv.customerId?.name || 'Customer';
                                    const invDate = new Date(inv.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                                    return (
                                        <option key={inv._id || inv.id} value={inv._id || inv.id}>
                                            {inv.invoiceNumber} - {custName} ({invDate}) - ₹{inv.total?.toLocaleString('en-IN')}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* Invoice & Date */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Invoice No *</label>
                                <input
                                    type="text"
                                    value={formData.invoiceNumber}
                                    onChange={e => handleInputChange('invoiceNumber', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Invoice Date *</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => handleInputChange('date', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer Name *</label>
                            <input
                                type="text"
                                value={formData.customerName}
                                onChange={e => handleInputChange('customerName', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer GSTIN</label>
                                <input
                                    type="text"
                                    value={formData.customerGSTIN}
                                    onChange={e => handleInputChange('customerGSTIN', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-800 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Customer State</label>
                                <input
                                    type="text"
                                    value={formData.customerState}
                                    onChange={e => handleInputChange('customerState', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Transport Parameters */}
                        <div className="border-t border-slate-100 pt-4 space-y-3">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Transport & Delivery Parameters</h3>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Vehicle Registration #</label>
                                    <input
                                        type="text"
                                        value={formData.vehicleNo}
                                        onChange={e => handleInputChange('vehicleNo', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Delivery Pincode *</label>
                                    <input
                                        type="number"
                                        value={formData.toPincode}
                                        onChange={e => handleInputChange('toPincode', e.target.value)}
                                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Delivery Place / City</label>
                                <input
                                    type="text"
                                    value={formData.toPlace}
                                    onChange={e => handleInputChange('toPlace', e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Line Item Summary */}
                        <div className="border-t border-slate-100 pt-4">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Line Item Preview ({formData.items.length})</h3>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                                {formData.items.map((item, idx) => {
                                    const total = item.qty * item.rate;
                                    const gstVal = (total * item.gstRate) / 100;
                                    const gross = total + gstVal;
                                    return (
                                        <div key={idx} className="border-b border-slate-200/60 pb-1.5 last:border-none last:pb-0">
                                            <div className="flex justify-between font-bold text-slate-800">
                                                <span>{item.name} ({item.qty} {item.unit})</span>
                                                <span>₹ {item.rate.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                                                <span>HSN: {item.hsn} | GST: {item.gstRate}% (+₹ {gstVal.toLocaleString('en-IN')})</span>
                                                <span className="font-bold text-indigo-600">Gross: ₹ {gross.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Column: Live Validation State & JSON Preview */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Compliance Box */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900">Validation Compliance Status</h2>
                            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                                validationResult.passed
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                                {validationResult.passed ? 'PASSED' : 'FAILED'}
                            </span>
                        </div>

                        {validationResult.passed ? (
                            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3 text-emerald-900">
                                <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-emerald-900">Validation Successful</h4>
                                    <p className="text-xs text-emerald-700 mt-1">
                                        This invoice complies fully with NIC GST E-Way Bill regulations. Total Invoice Value is ₹{validationResult.json?.billLists[0]?.totInvValue?.toLocaleString('en-IN')}.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-4 flex items-start gap-3 text-rose-900">
                                <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-rose-900">Regulatory Threshold Validation Failed</h4>
                                    <p className="text-xs text-rose-700 mt-1">
                                        {validationResult.error}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                onClick={handleDownload}
                                disabled={!validationResult.passed}
                                className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                                    validationResult.passed
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 cursor-pointer'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                }`}
                            >
                                <Download size={18} /> Download Official E-Way Bill JSON File
                            </button>
                        </div>
                    </div>

                    {/* JSON Code View Block */}
                    <div className="bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                        <div className="flex items-center justify-between bg-slate-900/80 border-b border-slate-800 px-6 py-3">
                            <span className="text-xs font-mono font-bold text-slate-300">NIC-SCHEMA-OUTPUT.json</span>
                            <button
                                onClick={handleCopyPayload}
                                disabled={!validationResult.passed}
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                                <Copy size={14} /> {copySuccess ? 'Copied!' : 'Copy Payload'}
                            </button>
                        </div>
                        <pre className="p-6 text-xs text-emerald-400 font-mono overflow-x-auto max-h-[420px] bg-[#090d16] leading-relaxed">
                            <code>
                                {validationResult.passed
                                    ? JSON.stringify(validationResult.json, null, 2)
                                    : `// E-Way Bill schema cannot be generated.\n// Error: ${validationResult.error}`
                                }
                            </code>
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EWayBillSandbox;
