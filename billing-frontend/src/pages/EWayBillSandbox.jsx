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
        <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111726] text-[#F8FAFC] p-6 rounded-2xl shadow-xl border border-[#1F2B45]">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <Truck size={28} className="text-[#FF7A18]" />
                        <span>E-Way Bill Formatter Sandbox</span>
                    </h1>
                    <p className="text-xs text-[#94A3B8] mt-1">
                        Verify NIC GST compliance formatting, threshold validation rules, and export official E-Way Bill JSON files.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-outline bg-[#0B0F19] text-[#F8FAFC] border-[#1F2B45] hover:bg-[#172033] text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                        <ArrowLeft size={14} /> Back to Dashboard
                    </button>
                    <span className="bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30 px-3 py-1 rounded-full text-xs font-bold">
                        GST Schema v1.0.0621
                    </span>
                </div>
            </div>

            {/* Main Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Form Controls */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#111726] p-6 rounded-2xl shadow-sm border border-[#1F2B45] space-y-4">
                        <h2 className="text-base font-bold text-[#F8FAFC] border-b border-[#1F2B45] pb-3">
                            Invoice & Transport Parameters
                        </h2>

                        {/* Existing Invoices Picker */}
                        <div>
                            <label className="block text-xs font-bold text-[#FF7A18] uppercase tracking-wider mb-1.5 flex justify-between">
                                <span>Import from Existing Invoices</span>
                                {loadingInvoices && <span className="text-[#94A3B8] text-[10px]">Loading...</span>}
                            </label>
                            <select
                                value={selectedInvoiceId}
                                onChange={handleSelectInvoice}
                                className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-semibold text-[#F8FAFC] focus:border-[#FF7A18] outline-none cursor-pointer"
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
                                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Invoice No *</label>
                                <input
                                    type="text"
                                    value={formData.invoiceNumber}
                                    onChange={e => handleInputChange('invoiceNumber', e.target.value)}
                                    className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-bold text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Invoice Date *</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => handleInputChange('date', e.target.value)}
                                    className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-medium text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                                />
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div>
                            <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Customer Name *</label>
                            <input
                                type="text"
                                value={formData.customerName}
                                onChange={e => handleInputChange('customerName', e.target.value)}
                                className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-medium text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Customer GSTIN</label>
                                <input
                                    type="text"
                                    value={formData.customerGSTIN}
                                    onChange={e => handleInputChange('customerGSTIN', e.target.value)}
                                    className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Customer State</label>
                                <input
                                    type="text"
                                    value={formData.customerState}
                                    onChange={e => handleInputChange('customerState', e.target.value)}
                                    className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-medium text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                                />
                            </div>
                        </div>

                        {/* Transport Parameters */}
                        <div className="border-t border-[#1F2B45] pt-4 space-y-3">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#94A3B8]">Transport & Delivery Parameters</h3>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Vehicle Registration #</label>
                                    <input
                                        type="text"
                                        value={formData.vehicleNo}
                                        onChange={e => handleInputChange('vehicleNo', e.target.value)}
                                        className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#FF7A18] focus:border-[#FF7A18] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Delivery Pincode *</label>
                                    <input
                                        type="number"
                                        value={formData.toPincode}
                                        onChange={e => handleInputChange('toPincode', e.target.value)}
                                        className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-bold text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase mb-1">Delivery Place / City</label>
                                <input
                                    type="text"
                                    value={formData.toPlace}
                                    onChange={e => handleInputChange('toPlace', e.target.value)}
                                    className="w-full bg-[#0B0F19] border border-[#1F2B45] rounded-xl px-3 py-2 text-xs font-medium text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                                />
                            </div>
                        </div>

                        {/* Line Item Summary */}
                        <div className="border-t border-[#1F2B45] pt-4">
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#94A3B8] mb-2">Line Item Preview ({formData.items.length})</h3>
                            <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1F2B45] space-y-2 text-xs">
                                {formData.items.map((item, idx) => {
                                    const total = item.qty * item.rate;
                                    const gstVal = (total * item.gstRate) / 100;
                                    const gross = total + gstVal;
                                    return (
                                        <div key={idx} className="border-b border-[#1F2B45] pb-1.5 last:border-none last:pb-0">
                                            <div className="flex justify-between font-bold text-[#F8FAFC]">
                                                <span>{item.name} ({item.qty} {item.unit})</span>
                                                <span>₹ {item.rate.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-[#94A3B8] mt-0.5">
                                                <span>HSN: {item.hsn} | GST: {item.gstRate}% (+₹ {gstVal.toLocaleString('en-IN')})</span>
                                                <span className="font-bold text-[#FF7A18]">Gross: ₹ {gross.toLocaleString('en-IN')}</span>
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
                    <div className="bg-[#111726] p-6 rounded-2xl shadow-sm border border-[#1F2B45] space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1F2B45] pb-3">
                            <h2 className="text-base font-bold text-[#F8FAFC]">Validation Compliance Status</h2>
                            <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                                validationResult.passed
                                    ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30'
                                    : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                            }`}>
                                {validationResult.passed ? 'PASSED' : 'FAILED'}
                            </span>
                        </div>

                        {validationResult.passed ? (
                            <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl p-4 flex items-start gap-3 text-[#22C55E]">
                                <CheckCircle size={20} className="text-[#22C55E] shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-[#22C55E]">Validation Successful</h4>
                                    <p className="text-xs text-[#94A3B8] mt-1">
                                        This invoice complies fully with NIC GST E-Way Bill regulations. Total Invoice Value is <strong className="text-[#F8FAFC]">₹{validationResult.json?.billLists[0]?.totInvValue?.toLocaleString('en-IN')}</strong>.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 flex items-start gap-3 text-[#EF4444]">
                                <AlertTriangle size={20} className="text-[#EF4444] shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-sm text-[#EF4444]">Regulatory Threshold Validation Failed</h4>
                                    <p className="text-xs text-[#94A3B8] mt-1">
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
                                        ? 'btn btn-primary cursor-pointer'
                                        : 'bg-[#0B0F19] text-[#94A3B8] cursor-not-allowed border border-[#1F2B45]'
                                }`}
                            >
                                <Download size={18} /> Download Official E-Way Bill JSON File
                            </button>
                        </div>
                    </div>

                    {/* JSON Code View Block */}
                    <div className="bg-[#0B0F19] rounded-2xl overflow-hidden border border-[#1F2B45] shadow-xl">
                        <div className="flex items-center justify-between bg-[#111726] border-b border-[#1F2B45] px-6 py-3">
                            <span className="text-xs font-mono font-bold text-[#94A3B8]">NIC-SCHEMA-OUTPUT.json</span>
                            <button
                                onClick={handleCopyPayload}
                                disabled={!validationResult.passed}
                                className="text-xs font-bold text-[#FF7A18] hover:text-[#FF923D] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                            >
                                <Copy size={14} /> {copySuccess ? 'Copied!' : 'Copy Payload'}
                            </button>
                        </div>
                        <pre className="p-6 text-xs text-[#22C55E] font-mono overflow-x-auto max-h-[420px] bg-[#07090E] leading-relaxed custom-scrollbar">
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
