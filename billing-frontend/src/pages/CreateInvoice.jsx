import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Plus, Trash2, Save, FileCheck, Calculator, User, Loader, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MY_STATE_NORMALIZED = 'tamilnadu';

const CreateInvoice = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    // --- Direct Invoice Creator State ---
    const [customerMode, setCustomerMode] = useState('select'); // 'select' | 'manual'
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerSearchText, setCustomerSearchText] = useState('');

    // Manual Customer State
    const [manualCustomer, setManualCustomer] = useState({
        name: '',
        phone: '',
        gstNumber: '',
        address: '',
        state: 'Tamil Nadu'
    });

    const [productMode, setProductMode] = useState('select'); // 'select' | 'manual'
    const [selectedProductCode, setSelectedProductCode] = useState('');

    // Manual Product/Item Input State
    const [manualProduct, setManualProduct] = useState({
        productCode: '',
        name: '',
        hsn: '',
        unit: 'Nos',
        sellingPrice: '',
        gstRate: '5'
    });

    // Invoice Items Table State
    const [items, setItems] = useState([]);

    // Settlement & Metadata State
    const [discountPercent, setDiscountPercent] = useState(0);
    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState('');

    // Shipping Address State
    const [isShipSameAsBill, setIsShipSameAsBill] = useState(true);
    const [shipTo, setShipTo] = useState({
        name: '',
        address: '',
        state: '',
        city: '',
        phone: ''
    });
    // Sync customer search text with selected customer ID
    useEffect(() => {
        if (selectedCustomerId) {
            const matched = customers.find(c => c._id === selectedCustomerId || c.id === selectedCustomerId);
            if (matched && matched.name !== customerSearchText) {
                setCustomerSearchText(matched.name);
            }
        } else {
            setCustomerSearchText('');
        }
    }, [selectedCustomerId, customers]);
    // Fetch initial master lists
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, prodRes] = await Promise.all([
                    api.get('/customers'),
                    api.get('/products')
                ]);
                setCustomers(custRes.data || []);
                setProducts(prodRes.data || []);
            } catch (error) {
                console.error("Error loading master lists", error);
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, []);

    // Get Active Customer properties (Dynamic depending on selection vs manual)
    const activeCustomer = useMemo(() => {
        if (customerMode === 'select') {
            return customers.find(c => c._id === selectedCustomerId || c.id === selectedCustomerId);
        } else {
            return {
                name: manualCustomer.name,
                phone: manualCustomer.phone,
                gstNumber: manualCustomer.gstNumber || 'URD',
                address: manualCustomer.address,
                state: manualCustomer.state
            };
        }
    }, [customerMode, selectedCustomerId, customers, manualCustomer]);

    // Sync Shipping Details if same as billing
    useEffect(() => {
        if (isShipSameAsBill && activeCustomer) {
            setShipTo({
                name: activeCustomer.name || '',
                address: activeCustomer.address || '',
                state: activeCustomer.state || '',
                city: '',
                phone: activeCustomer.phone || ''
            });
        }
    }, [isShipSameAsBill, activeCustomer]);

    // Identify if Tamil Nadu (Intra-state)
    const isIntraState = useMemo(() => {
        if (!activeCustomer?.state) return false;
        const normalized = activeCustomer.state.replace(/\s+/g, '').toLowerCase();
        return normalized === MY_STATE_NORMALIZED;
    }, [activeCustomer]);

    // Add Product from Catalog
    const handleAddCatalogProduct = () => {
        const product = products.find(p =>
            p._id === selectedProductCode ||
            p.productCode === selectedProductCode ||
            p.code === selectedProductCode
        );
        if (!product) return;

        const existingItem = items.find(i => i.productId === product._id);
        if (existingItem) {
            alert("Product already added! Adjust quantity in the table.");
            return;
        }

        const newItem = {
            productId: product._id,
            productCode: product.productCode || product.code || '-',
            name: product.name,
            hsn: product.hsn || '-',
            unit: product.unit || 'Nos',
            rate: product.sellingPrice || 0,
            gstRate: product.gstRate || 0,
            quantity: 1,
            stock: product.stockQty ?? 0
        };

        setItems([...items, newItem]);
        setSelectedProductCode('');
    };

    // Add Custom Manual Product
    const handleAddManualProduct = () => {
        if (!manualProduct.name || !manualProduct.sellingPrice) {
            alert("Please enter at least a Product Name and Rate.");
            return;
        }

        const newItem = {
            productId: null,
            productCode: manualProduct.productCode || 'Custom',
            name: manualProduct.name,
            hsn: manualProduct.hsn || '-',
            unit: manualProduct.unit || 'Nos',
            rate: parseFloat(manualProduct.sellingPrice) || 0,
            gstRate: parseFloat(manualProduct.gstRate) || 0,
            quantity: 1,
            stock: 9999 // Manual items have virtual infinite stock
        };

        setItems([...items, newItem]);
        setManualProduct({
            productCode: '',
            name: '',
            hsn: '',
            unit: 'Nos',
            sellingPrice: '',
            gstRate: '5'
        });
    };

    // Remove item from table
    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Table cell edits
    const handleUpdateItemCell = (index, field, value) => {
        const updated = [...items];
        if (field === 'quantity') {
            updated[index].quantity = parseFloat(value) || 0;
        } else if (field === 'rate') {
            updated[index].rate = parseFloat(value) || 0;
        } else if (field === 'gstRate') {
            updated[index].gstRate = parseFloat(value) || 0;
        }
        setItems(updated);
    };

    // Live Calculation Engine
    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
        const discountAmount = subtotal * (parseFloat(discountPercent) / 100 || 0);
        const taxableTotal = subtotal - discountAmount;

        const taxableFactor = subtotal > 0 ? (taxableTotal / subtotal) : 1;

        let totalGST = 0;
        const taxSlabs = {};

        items.forEach(item => {
            const rate = Number(item.gstRate || 0);
            const itemAmount = item.rate * item.quantity;
            const itemTaxable = itemAmount * taxableFactor;
            const itemGST = itemTaxable * (rate / 100);

            totalGST += itemGST;

            if (rate > 0) {
                if (!taxSlabs[rate]) taxSlabs[rate] = { taxable: 0, tax: 0 };
                taxSlabs[rate].taxable += itemTaxable;
                taxSlabs[rate].tax += itemGST;
            }
        });

        const exactTotal = taxableTotal + totalGST;
        const roundedTotal = Math.round(exactTotal);
        const roundOff = roundedTotal - exactTotal;

        return {
            subtotal,
            discountAmount,
            taxableTotal,
            totalGST,
            grandTotal: roundedTotal,
            roundOff,
            taxSlabs
        };
    }, [items, discountPercent]);


    // Handle Form Submit
    const handleSaveInvoice = async (e) => {
        e.preventDefault();

        // Validations
        if (customerMode === 'select' && !selectedCustomerId) {
            alert("Please select a customer.");
            return;
        }
        if (customerMode === 'manual' && !manualCustomer.name) {
            alert("Please enter a manual customer name.");
            return;
        }
        if (!invoiceNumber || !invoiceNumber.trim()) {
            alert("Please enter a mandatory Invoice Number.");
            return;
        }
        if (items.length === 0) {
            alert("Please add at least one item to the invoice.");
            return;
        }

        setLoading(true);

        const payload = {
            invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
            customerId: customerMode === 'select' ? selectedCustomerId : null,

            // Manual customer fields
            customerName: customerMode === 'manual' ? manualCustomer.name : null,
            customerGSTIN: customerMode === 'manual' ? manualCustomer.gstNumber || 'URD' : null,
            customerAddress: customerMode === 'manual' ? manualCustomer.address : null,
            customerState: customerMode === 'manual' ? manualCustomer.state : null,
            customerPhone: customerMode === 'manual' ? manualCustomer.phone : null,

            items: items.map(item => ({
                productId: item.productId,
                name: item.name,
                hsn: item.hsn,
                unit: item.unit,
                qty: item.quantity,
                rate: item.rate,
                gstRate: item.gstRate,
                amount: item.quantity * item.rate
            })),
            discountPercent: parseFloat(discountPercent) || 0,
            paymentType: 'Cash',
            paidAmount: 0,
            date: invoiceDate,
            dueDate: invoiceDate,
            shipTo
        };

        try {
            await api.post('/invoices', payload);
            alert("Direct Invoice Saved Successfully!");
            navigate('/invoices');
        } catch (error) {
            console.error("Direct Invoice Save Failed", error);
            alert(error.response?.data?.error || "Failed to save direct invoice.");
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="flex items-center justify-center h-[80vh] text-blue-500">
                <Loader className="animate-spin w-10 h-10 mr-2" /> Initializing direct billing catalog...
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center no-print">
                <button
                    onClick={() => navigate('/invoices')}
                    className="btn btn-outline bg-white flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Back to Invoices
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (window.confirm("Clear all draft edits?")) {
                                setItems([]);
                                setSelectedCustomerId('');
                                setManualCustomer({ name: '', phone: '', gstNumber: '', address: '', state: 'Tamil Nadu' });
                                setDiscountPercent(0);
                                setInvoiceNumber('');
                            }
                        }}
                        className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50"
                    >
                        Reset Form
                    </button>
                </div>
            </div>

            {/* Split Grid: Customer & Catalog/Product Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. CUSTOMER SECTION */}
                <div className="card lg:col-span-1 border-t-4 border-blue-500 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <User size={20} className="text-blue-500" /> Customer Details
                        </h3>
                        <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setCustomerMode('select')}
                                className={`px-3 py-1 rounded-md transition-all ${customerMode === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Select
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomerMode('manual')}
                                className={`px-3 py-1 rounded-md transition-all ${customerMode === 'manual' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Manual
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {customerMode === 'select' ? (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Search Customer Directory</label>
                                <input
                                    list="customer-list"
                                    type="text"
                                    placeholder="Type customer name to search..."
                                    className="w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"
                                    value={customerSearchText}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setCustomerSearchText(val);
                                        const matched = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                                        if (matched) {
                                            setSelectedCustomerId(matched._id || matched.id);
                                        } else {
                                            setSelectedCustomerId('');
                                        }
                                    }}
                                />
                                <datalist id="customer-list">
                                    {customers.map(c => (
                                        <option key={c._id || c.id} value={c.name}>
                                            {c.phone ? `Phone: ${c.phone}` : ''} {c.gstNumber ? `| GST: ${c.gstNumber}` : ''}
                                        </option>
                                    ))}
                                </datalist>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Customer Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border rounded px-3 py-2 text-sm"
                                        placeholder="Full Billing Name"
                                        value={manualCustomer.name}
                                        onChange={e => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                                        <input
                                            type="text"
                                            maxLength="11"
                                            className="w-full border rounded px-3 py-2 text-sm"
                                            placeholder="Max 11-digit Mobile"
                                            value={manualCustomer.phone}
                                            onChange={e => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">GSTIN</label>
                                        <input
                                            type="text"
                                            maxLength="15"
                                            className="w-full border rounded px-3 py-2 text-sm uppercase"
                                            placeholder="15-digit GSTIN"
                                            value={manualCustomer.gstNumber}
                                            onChange={e => setManualCustomer({ ...manualCustomer, gstNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Billing State *</label>
                                    <select
                                        className="w-full border rounded px-3 py-2 text-sm bg-white"
                                        value={manualCustomer.state}
                                        onChange={e => setManualCustomer({ ...manualCustomer, state: e.target.value })}
                                    >
                                        <option value="Tamil Nadu">Tamil Nadu (Home State)</option>
                                        <option value="Kerala">Kerala</option>
                                        <option value="Karnataka">Karnataka</option>
                                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                                        <option value="Pondicherry">Pondicherry</option>
                                        <option value="Maharashtra">Maharashtra</option>
                                        <option value="Delhi">Delhi</option>
                                        <option value="Other">Other State</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Billing Address</label>
                                    <textarea
                                        className="w-full border rounded px-3 py-1.5 text-sm resize-none"
                                        rows="2"
                                        placeholder="Full address details"
                                        value={manualCustomer.address}
                                        onChange={e => setManualCustomer({ ...manualCustomer, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {customerMode === 'select' && activeCustomer && (
                            <div className="bg-blue-50/50 p-4 border border-blue-100/50 rounded-xl text-sm space-y-1.5 mt-2">
                                <p className="font-semibold text-blue-900">{activeCustomer.name}</p>
                                <p className="text-gray-600"><strong>Phone:</strong> {activeCustomer.phone || '-'}</p>
                                <p className="text-gray-600"><strong>State:</strong> {activeCustomer.state} {isIntraState ? '(Intra-state split)' : '(Inter-state IGST)'}</p>
                                <p className="text-gray-600"><strong>GSTIN:</strong> <span className="font-mono text-xs">{activeCustomer.gstNumber || 'URD'}</span></p>
                            </div>
                        )}
                    </div>

                    {/* Ship To Segment */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-gray-700 text-sm">Shipping Information</h4>
                            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 w-3 h-3 text-blue-600"
                                    checked={isShipSameAsBill}
                                    onChange={e => setIsShipSameAsBill(e.target.checked)}
                                />
                                Same as Billing Address
                            </label>
                        </div>

                        {!isShipSameAsBill && (
                            <div className="space-y-2.5">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Receiver Name</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs py-1 px-2 border rounded"
                                        value={shipTo.name}
                                        onChange={e => setShipTo({ ...shipTo, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Shipping Address</label>
                                    <textarea
                                        className="w-full text-xs py-1 px-2 border rounded resize-none"
                                        rows="2"
                                        value={shipTo.address}
                                        onChange={e => setShipTo({ ...shipTo, address: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">City</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs py-1 px-2 border rounded"
                                            value={shipTo.city || ''}
                                            onChange={e => setShipTo({ ...shipTo, city: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">State</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs py-1 px-2 border rounded"
                                            value={shipTo.state}
                                            onChange={e => setShipTo({ ...shipTo, state: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. PRODUCT ADDITION SECTION */}
                <div className="card lg:col-span-2 border-t-4 border-indigo-500 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Calculator size={20} className="text-indigo-500" /> Add Items to Invoice
                        </h3>
                        <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setProductMode('select')}
                                className={`px-3 py-1 rounded-md transition-all ${productMode === 'select' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Search Catalog
                            </button>
                            <button
                                type="button"
                                onClick={() => setProductMode('manual')}
                                className={`px-3 py-1 rounded-md transition-all ${productMode === 'manual' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Manual Custom Product
                            </button>
                        </div>
                    </div>

                    {productMode === 'select' ? (
                        <div className="flex gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Search Catalog Product</label>
                                <input
                                    list="product-list"
                                    type="text"
                                    placeholder="Type code or name..."
                                    className="w-full h-10 border border-gray-200 rounded-lg px-3 bg-white"
                                    value={selectedProductCode}
                                    onChange={e => setSelectedProductCode(e.target.value)}
                                />
                                <datalist id="product-list">
                                    {products.map(p => (
                                        <option key={p._id} value={p.productCode || p.code || ''}>
                                            {p.name} - ₹{p.sellingPrice} - (Stock: {p.stockQty})
                                        </option>
                                    ))}
                                </datalist>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddCatalogProduct}
                                className="btn btn-primary h-10 shadow-md hover:shadow-indigo-500/10 flex items-center justify-center px-6"
                            >
                                <Plus size={18} /> Add Catalog
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Product Code</label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border rounded px-3 bg-white text-sm"
                                        placeholder="e.g. FFI-VALVE"
                                        value={manualProduct.productCode}
                                        onChange={e => setManualProduct({ ...manualProduct, productCode: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Product Name *</label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border rounded px-3 bg-white text-sm"
                                        placeholder="Detailed item description"
                                        value={manualProduct.name}
                                        onChange={e => setManualProduct({ ...manualProduct, name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">HSN Code</label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border rounded px-3 bg-white text-sm"
                                        placeholder="e.g. 8424"
                                        value={manualProduct.hsn}
                                        onChange={e => setManualProduct({ ...manualProduct, hsn: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Unit</label>
                                    <select
                                        className="w-full h-9 border rounded px-2 bg-white text-sm"
                                        value={manualProduct.unit}
                                        onChange={e => setManualProduct({ ...manualProduct, unit: e.target.value })}
                                    >
                                        {['Nos', 'Pcs', 'Box', 'Set', 'Mtr', 'SqFt', 'Kg', 'Ltr', 'Bag', 'Dozen'].map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Rate (₹) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full h-9 border rounded px-3 bg-white text-sm font-semibold text-right"
                                        placeholder="Selling Rate"
                                        value={manualProduct.sellingPrice}
                                        onChange={e => setManualProduct({ ...manualProduct, sellingPrice: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">GST Rate %</label>
                                    <select
                                        className="w-full h-9 border rounded px-2 bg-white text-sm"
                                        value={manualProduct.gstRate}
                                        onChange={e => setManualProduct({ ...manualProduct, gstRate: e.target.value })}
                                    >
                                        {['0', '5', '12', '18', '28'].map(g => (
                                            <option key={g} value={g}>{g}%</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1 flex items-end">
                                    <button
                                        type="button"
                                        onClick={handleAddManualProduct}
                                        className="btn btn-primary h-9 w-full flex items-center justify-center gap-1 shadow-md"
                                    >
                                        <Plus size={16} /> Add Custom
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Helper Info */}
                    <div className="mt-4 text-xs text-slate-400">

                    </div>
                </div>
            </div>

            {/* 3. ITEMS TABLE */}
            <div className="card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-md font-bold text-gray-800">Invoice Items List</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                <th className="p-4 font-semibold">Product Description</th>
                                <th className="p-4 font-semibold w-24">HSN</th>
                                <th className="p-4 font-semibold w-32">Qty</th>
                                <th className="p-4 font-semibold w-20">Unit</th>
                                <th className="p-4 font-semibold w-36">Rate (₹)</th>
                                <th className="p-4 font-semibold w-28">GST %</th>
                                <th className="p-4 font-semibold w-36 text-right">Amount (₹)</th>
                                <th className="p-4 font-semibold w-16 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item, index) => (
                                <tr key={index} className="hover:bg-blue-50/10 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            Code: <span className="font-semibold text-slate-700">{item.productCode}</span>
                                            {item.productId && (
                                                <span className="ml-2 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] text-blue-700 font-bold border border-blue-100">Cataloged</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-semibold">{item.hsn}</span>
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            className="w-24 px-2 py-1 border rounded text-center text-sm font-semibold"
                                            value={item.quantity}
                                            onChange={e => handleUpdateItemCell(index, 'quantity', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4 text-gray-500 font-medium">{item.unit}</td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-28 px-2 py-1 border rounded text-right text-sm font-semibold"
                                            value={item.rate}
                                            onChange={e => handleUpdateItemCell(index, 'rate', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <select
                                            className="w-20 px-1 py-1 border rounded text-sm bg-white"
                                            value={item.gstRate}
                                            onChange={e => handleUpdateItemCell(index, 'gstRate', e.target.value)}
                                        >
                                            {['0', '5', '12', '18', '28'].map(g => (
                                                <option key={g} value={g}>{g}%</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-gray-900 text-right">
                                        ₹ {(item.rate * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center py-12 text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <FileText size={48} className="mb-3 opacity-20" />
                                            <p className="font-semibold text-gray-500">No items added to invoice yet</p>
                                            <p className="text-xs">Add products from catalog search or manual entries above.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. TOTALS & SUBMISSION SEGMENT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Meta Inputs & Settlements */}
                <div className="card md:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-md font-bold text-gray-800 border-b pb-2">Invoice Details</h3>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Invoice Date</label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2 text-sm outline-none bg-gray-50 font-medium"
                            value={invoiceDate}
                            onChange={e => setInvoiceDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Invoice Number *</label>
                        <input
                            type="text"
                            placeholder="Enter Mandatory Invoice Number"
                            className="w-full border rounded px-3 py-2 text-sm outline-none bg-gray-50 font-medium uppercase"
                            required
                            value={invoiceNumber}
                            onChange={e => setInvoiceNumber(e.target.value)}
                        />
                    </div>


                </div>

                {/* Calculations Panel & Save Button */}
                <div className="card md:col-span-2 bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200/50 space-y-4">
                    <h3 className="text-md font-bold text-gray-800 border-b pb-2">Financial Breakdown</h3>

                    <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Subtotal (Gross Item Total)</span>
                            <span className="font-mono font-bold text-slate-800">₹ {totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-gray-200/60 shadow-xs hover:border-blue-300 transition-all">
                            <span className="text-slate-600 font-semibold text-xs uppercase tracking-wider">Discount Percentage</span>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-24 pl-3 pr-8 py-1 border border-gray-200 rounded-lg text-right font-bold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-gray-100/50 transition-colors"
                                    value={discountPercent}
                                    onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                />
                                <span className="absolute right-3 text-slate-400 font-bold text-sm pointer-events-none">%</span>
                            </div>
                        </div>
                        {totals.discountAmount > 0 && (
                            <div className="flex justify-between text-xs text-green-600">
                                <span>Discount Amount</span>
                                <span className="font-mono font-bold">- ₹ {totals.discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-b pb-2 border-gray-200">
                            <span className="text-slate-500">Taxable Net Amount</span>
                            <span className="font-mono font-bold text-slate-800">₹ {totals.taxableTotal.toFixed(2)}</span>
                        </div>

                        {/* GST Breakup */}
                        {activeCustomer && (
                            Object.keys(totals.taxSlabs).sort((a, b) => Number(a) - Number(b)).map(rate => {
                                const slab = totals.taxSlabs[rate];
                                return isIntraState ? (
                                    <React.Fragment key={rate}>
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span>CGST @ {Number(rate) / 2}% (on ₹ {slab.taxable.toFixed(2)})</span>
                                            <span className="font-mono">+ ₹ {(slab.tax / 2).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span>SGST @ {Number(rate) / 2}% (on ₹ {slab.taxable.toFixed(2)})</span>
                                            <span className="font-mono">+ ₹ {(slab.tax / 2).toFixed(2)}</span>
                                        </div>
                                    </React.Fragment>
                                ) : (
                                    <div key={rate} className="flex justify-between text-xs text-slate-600">
                                        <span>IGST @ {rate}% (on ₹ {slab.taxable.toFixed(2)})</span>
                                        <span className="font-mono">+ ₹ {slab.tax.toFixed(2)}</span>
                                    </div>
                                );
                            })
                        )}

                        {/* Round-Off Adjuster */}
                        {Math.abs(totals.roundOff) > 0 && (
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>Round Off Adjustment (R/O)</span>
                                <span className="font-mono">{totals.roundOff > 0 ? '+' : ''} ₹ {totals.roundOff.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between border-t pt-3 border-gray-300 mt-4">
                            <span className="text-lg font-bold text-slate-900">Grand Total Payable</span>
                            <span className="text-2xl font-extrabold text-blue-600 font-mono">₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleSaveInvoice}
                            disabled={loading || items.length === 0}
                            className="btn btn-primary w-full py-4 text-base font-bold shadow-lg shadow-blue-500/10 flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <FileCheck size={20} />
                            )}
                            Save & Generate Direct Tax Invoice
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreateInvoice;
