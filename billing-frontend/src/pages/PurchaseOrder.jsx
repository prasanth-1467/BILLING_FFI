import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Plus, Trash2, Save, ShoppingCart, Loader, FileText, ArrowLeft, Calculator, User, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PurchaseOrder = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);

    // --- Supplier Selector State ---
    const [supplierMode, setSupplierMode] = useState(() => localStorage.getItem('po_supplierMode') || 'select'); // 'select' | 'manual'
    const [selectedSupplierId, setSelectedSupplierId] = useState(() => localStorage.getItem('po_supplierId') || '');
    const [supplierSearchText, setSupplierSearchText] = useState('');

    // Manual Supplier State
    const [manualSupplier, setManualSupplier] = useState(() => {
        const saved = localStorage.getItem('po_manualSupplier');
        return saved ? JSON.parse(saved) : {
            name: '',
            phone: '',
            email: '',
            gstin: '',
            address: ''
        };
    });

    // --- Product Selection State ---
    const [productMode, setProductMode] = useState('select'); // 'select' | 'manual'
    const [selectedProductCode, setSelectedProductCode] = useState('');

    // Manual Product/Item Input State
    const [manualProduct, setManualProduct] = useState({
        productCode: '',
        name: '',
        modelNo: '',
        unit: 'Nos',
        purchasePrice: '',
        gstRate: '5'
    });

    // PO General Metadata State
    const [poDate, setPoDate] = useState(() => localStorage.getItem('po_date') || new Date().toISOString().split('T')[0]);
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => localStorage.getItem('po_expectedDeliveryDate') || '');
    const [remarks, setRemarks] = useState(() => localStorage.getItem('po_remarks') || '');
    const [poNumber, setPoNumber] = useState(() => localStorage.getItem('po_number') || `PO-${Date.now()}`);

    // Items List
    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('po_items');
        return saved ? JSON.parse(saved) : [];
    });

    // Persist form state in localStorage
    useEffect(() => {
        localStorage.setItem('po_supplierMode', supplierMode);
        localStorage.setItem('po_supplierId', selectedSupplierId);
        localStorage.setItem('po_manualSupplier', JSON.stringify(manualSupplier));
        localStorage.setItem('po_date', poDate);
        localStorage.setItem('po_expectedDeliveryDate', expectedDeliveryDate);
        localStorage.setItem('po_items', JSON.stringify(items));
        localStorage.setItem('po_remarks', remarks);
        localStorage.setItem('po_number', poNumber);
    }, [supplierMode, selectedSupplierId, manualSupplier, poDate, expectedDeliveryDate, items, remarks, poNumber]);

    // Fetch master directories
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [suppRes, prodRes] = await Promise.all([
                    api.get('/suppliers'),
                    api.get('/products')
                ]);
                setSuppliers(suppRes.data || []);
                setProducts(prodRes.data || []);
            } catch (error) {
                console.error("Error loading master lists", error);
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, []);

    // Sync supplier search text with selected ID
    useEffect(() => {
        if (selectedSupplierId) {
            const matched = suppliers.find(s => s._id === selectedSupplierId || s.id === selectedSupplierId);
            if (matched && matched.name !== supplierSearchText) {
                setSupplierSearchText(matched.name);
            }
        } else {
            setSupplierSearchText('');
        }
    }, [selectedSupplierId, suppliers]);

    // Resolve Active Supplier properties
    const activeSupplier = useMemo(() => {
        if (supplierMode === 'select') {
            return suppliers.find(s => s._id === selectedSupplierId || s.id === selectedSupplierId);
        } else {
            return {
                name: manualSupplier.name,
                phone: manualSupplier.phone,
                email: manualSupplier.email,
                gstin: manualSupplier.gstin,
                address: manualSupplier.address
            };
        }
    }, [supplierMode, selectedSupplierId, suppliers, manualSupplier]);

    // Add Product from Catalog
    const handleAddCatalogProduct = () => {
        if (!selectedProductCode.trim()) return;

        const product = products.find(p =>
            p._id === selectedProductCode ||
            p.productCode === selectedProductCode ||
            p.code === selectedProductCode
        );
        if (!product) return;

        const existingItem = items.find(i => i.product === product._id);
        if (existingItem) {
            alert("Product already added! Adjust quantity in the table.");
            return;
        }

        const newItem = {
            product: product._id,
            productCode: product.productCode || product.code || '-',
            name: product.name,
            modelNo: '',
            unit: product.unit || 'Nos',
            rate: product.purchasePrice || 0,
            gstRate: product.gstRate || 0,
            qty: 1
        };

        setItems([...items, newItem]);
        setSelectedProductCode('');
    };

    // Add Custom Manual Product
    const handleAddManualProduct = () => {
        if (!manualProduct.name || !manualProduct.purchasePrice) {
            alert("Please enter at least a Product Name and Rate.");
            return;
        }

        const newItem = {
            product: null,
            productCode: manualProduct.productCode || 'Custom',
            name: manualProduct.name,
            modelNo: manualProduct.modelNo || '',
            unit: manualProduct.unit || 'Nos',
            rate: parseFloat(manualProduct.purchasePrice) || 0,
            gstRate: parseFloat(manualProduct.gstRate) || 0,
            qty: 1
        };

        setItems([...items, newItem]);
        setManualProduct({
            productCode: '',
            name: '',
            modelNo: '',
            unit: 'Nos',
            purchasePrice: '',
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
        if (field === 'qty') {
            updated[index].qty = parseFloat(value) || 0;
        } else if (field === 'rate') {
            updated[index].rate = parseFloat(value) || 0;
        } else if (field === 'gstRate') {
            updated[index].gstRate = parseFloat(value) || 0;
        } else if (field === 'modelNo') {
            updated[index].modelNo = value;
        } else if (field === 'name') {
            updated[index].name = value;
        } else if (field === 'unit') {
            updated[index].unit = value;
        }
        setItems(updated);
    };

    // Live Calculations
    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (Number(item.rate || 0) * Number(item.qty || 0)), 0);
        let totalGST = 0;
        const taxSlabs = {};

        items.forEach(item => {
            const rate = Number(item.gstRate || 0);
            const itemAmount = Number(item.rate || 0) * Number(item.qty || 0);
            const itemGST = itemAmount * (rate / 100);

            totalGST += itemGST;

            if (rate > 0) {
                if (!taxSlabs[rate]) taxSlabs[rate] = { taxable: 0, tax: 0 };
                taxSlabs[rate].taxable += itemAmount;
                taxSlabs[rate].tax += itemGST;
            }
        });

        const exactTotal = subtotal + totalGST;
        const roundedTotal = Math.round(exactTotal);
        const roundOff = roundedTotal - exactTotal;

        return {
            subtotal,
            totalGST,
            grandTotal: roundedTotal,
            roundOff,
            taxSlabs
        };
    }, [items]);

    // Handle Form Submit
    const handleSavePO = async (e) => {
        e.preventDefault();

        // Validations
        if (supplierMode === 'select' && !selectedSupplierId) {
            alert("Please select a supplier.");
            return;
        }
        if (supplierMode === 'manual' && !manualSupplier.name) {
            alert("Please enter a manual supplier name.");
            return;
        }
        if (!poNumber || !poNumber.trim()) {
            alert("Please enter a mandatory PO Number.");
            return;
        }
        if (items.length === 0) {
            alert("Please add at least one item.");
            return;
        }

        setLoading(true);

        const payload = {
            poNumber: poNumber.trim(),
            supplier: supplierMode === 'select' ? selectedSupplierId : null,

            // Manual supplier fields
            supplierName: supplierMode === 'manual' ? manualSupplier.name : null,
            supplierGSTIN: supplierMode === 'manual' ? manualSupplier.gstin || 'URD' : null,
            supplierAddress: supplierMode === 'manual' ? manualSupplier.address : null,
            supplierPhone: supplierMode === 'manual' ? manualSupplier.phone : null,
            supplierEmail: supplierMode === 'manual' ? manualSupplier.email : null,

            date: poDate,
            expectedDeliveryDate: expectedDeliveryDate || null,
            items: items.map(item => ({
                product: item.product,
                name: item.name,
                modelNo: item.modelNo,
                qty: parseFloat(item.qty),
                unit: item.unit,
                rate: parseFloat(item.rate),
                gstRate: parseFloat(item.gstRate)
            })),
            remarks,
            status: 'Draft'
        };

        try {
            await api.post('/purchase-orders', payload);
            
            // Clear local storage on success
            localStorage.removeItem('po_supplierMode');
            localStorage.removeItem('po_supplierId');
            localStorage.removeItem('po_manualSupplier');
            localStorage.removeItem('po_date');
            localStorage.removeItem('po_expectedDeliveryDate');
            localStorage.removeItem('po_items');
            localStorage.removeItem('po_remarks');
            localStorage.removeItem('po_number');

            alert("Purchase Order Saved Successfully!");
            navigate('/purchase-orders');
        } catch (error) {
            console.error("Save Purchase Order Failed", error);
            alert(error.response?.data?.error || "Failed to save purchase order.");
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="flex items-center justify-center h-[80vh] text-green-500">
                <Loader className="animate-spin w-10 h-10 mr-2" /> Initializing purchase order catalog...
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center no-print">
                <button
                    onClick={() => navigate('/purchase-orders')}
                    className="btn btn-outline bg-white flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> Back to PO List
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (window.confirm("Clear all draft edits?")) {
                                setItems([]);
                                setSelectedSupplierId('');
                                setManualSupplier({ name: '', phone: '', email: '', gstin: '', address: '' });
                                setRemarks('');
                                setPoNumber(`PO-${Date.now()}`);
                            }
                        }}
                        className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50"
                    >
                        Reset Form
                    </button>
                </div>
            </div>

            {/* Title Block */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-5 rounded-2xl border border-gray-100 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="text-green-500" /> Create Purchase Order
                    </h2>
                    <p className="text-sm text-gray-500">Generate a custom or cataloged supplier purchase order.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <label className="font-semibold text-gray-700">PO Number *:</label>
                    <input
                        type="text"
                        className="font-mono font-bold text-gray-900 border-b border-gray-300 focus:border-green-500 focus:outline-none w-44 text-right uppercase bg-transparent"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                    />
                </div>
            </div>

            {/* Split Grid: Supplier & Product Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. SUPPLIER SECTION */}
                <div className="card lg:col-span-1 border-t-4 border-green-500 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <User size={20} className="text-green-500" /> Supplier Details
                        </h3>
                        <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setSupplierMode('select')}
                                className={`px-3 py-1 rounded-md transition-all ${supplierMode === 'select' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Select
                            </button>
                            <button
                                type="button"
                                onClick={() => setSupplierMode('manual')}
                                className={`px-3 py-1 rounded-md transition-all ${supplierMode === 'manual' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                Manual
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {supplierMode === 'select' ? (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Search Supplier Directory</label>
                                <input
                                    list="supplier-list"
                                    type="text"
                                    placeholder="Type supplier name to search..."
                                    className="w-full h-10 border border-gray-200 rounded-lg px-3 bg-white text-sm"
                                    value={supplierSearchText}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSupplierSearchText(val);
                                        const matched = suppliers.find(s => s.name.toLowerCase() === val.toLowerCase());
                                        if (matched) {
                                            setSelectedSupplierId(matched._id || matched.id);
                                        } else {
                                            setSelectedSupplierId('');
                                        }
                                    }}
                                />
                                <datalist id="supplier-list">
                                    {suppliers.map(s => (
                                        <option key={s._id || s.id} value={s.name}>
                                            {s.phone ? `Phone: ${s.phone}` : ''} {s.gstin ? `| GST: ${s.gstin}` : ''}
                                        </option>
                                    ))}
                                </datalist>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Supplier Name *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border rounded px-3 py-2 text-sm"
                                        placeholder="Full Supplier/Company Name"
                                        value={manualSupplier.name}
                                        onChange={e => setManualSupplier({ ...manualSupplier, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded px-3 py-2 text-sm"
                                            placeholder="Mobile"
                                            value={manualSupplier.phone}
                                            onChange={e => setManualSupplier({ ...manualSupplier, phone: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">GSTIN</label>
                                        <input
                                            type="text"
                                            maxLength="15"
                                            className="w-full border rounded px-3 py-2 text-sm uppercase"
                                            placeholder="15-digit GSTIN"
                                            value={manualSupplier.gstin}
                                            onChange={e => setManualSupplier({ ...manualSupplier, gstin: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full border rounded px-3 py-2 text-sm"
                                        placeholder="Email Address"
                                        value={manualSupplier.email}
                                        onChange={e => setManualSupplier({ ...manualSupplier, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Supplier Address</label>
                                    <textarea
                                        className="w-full border rounded px-3 py-1.5 text-sm resize-none"
                                        rows="2"
                                        placeholder="Full supplier address"
                                        value={manualSupplier.address}
                                        onChange={e => setManualSupplier({ ...manualSupplier, address: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {supplierMode === 'select' && activeSupplier && (
                            <div className="bg-green-50/50 p-4 border border-green-100/50 rounded-xl text-sm space-y-1.5 mt-2">
                                <p className="font-semibold text-green-900">{activeSupplier.name}</p>
                                <p className="text-gray-600"><strong>Phone:</strong> {activeSupplier.phone || '-'}</p>
                                <p className="text-gray-600"><strong>Email:</strong> {activeSupplier.email || '-'}</p>
                                <p className="text-gray-600"><strong>GSTIN:</strong> <span className="font-mono text-xs">{activeSupplier.gstin || 'URD'}</span></p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. PRODUCT ADDITION SECTION */}
                <div className="card lg:col-span-2 border-t-4 border-indigo-500 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Calculator size={20} className="text-indigo-500" /> Add Items to Purchase Order
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
                                            {p.name} - ₹{p.purchasePrice}
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
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Model / Part No</label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border rounded px-3 bg-white text-sm"
                                        placeholder="Model No"
                                        value={manualProduct.modelNo}
                                        onChange={e => setManualProduct({ ...manualProduct, modelNo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Unit</label>
                                    <select
                                        className="w-full h-9 border rounded px-2 bg-white text-sm"
                                        value={manualProduct.unit}
                                        onChange={e => setManualProduct({ ...manualProduct, unit: e.target.value })}
                                    >
                                        {['Nos', 'PCS', 'Pcs', 'Box', 'Set', 'Mtr', 'SqFt', 'Kg', 'Ltr', 'Bag', 'Dozen'].map(u => (
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
                                        placeholder="Purchase Rate"
                                        value={manualProduct.purchasePrice}
                                        onChange={e => setManualProduct({ ...manualProduct, purchasePrice: e.target.value })}
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
                </div>
            </div>

            {/* 3. ITEMS TABLE */}
            <div className="card bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-md font-bold text-gray-800">Purchase Order Items List</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                <th className="p-4 font-semibold">Product Description</th>
                                <th className="p-4 font-semibold w-40">Model No</th>
                                <th className="p-4 font-semibold w-32">Qty</th>
                                <th className="p-4 font-semibold w-24">Unit</th>
                                <th className="p-4 font-semibold w-36">Rate (₹)</th>
                                <th className="p-4 font-semibold w-28">GST %</th>
                                <th className="p-4 font-semibold w-36 text-right">Amount (₹)</th>
                                <th className="p-4 font-semibold w-16 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map((item, index) => (
                                <tr key={index} className="hover:bg-green-50/10 transition-colors">
                                    <td className="p-4">
                                        {!item.product ? (
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1 border rounded text-sm font-semibold text-gray-900 focus:ring-green-500 focus:border-green-500 outline-none"
                                                value={item.name}
                                                onChange={e => handleUpdateItemCell(index, 'name', e.target.value)}
                                            />
                                        ) : (
                                            <>
                                                <div className="font-bold text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    Code: <span className="font-semibold text-slate-700">{item.productCode}</span>
                                                    <span className="ml-2 bg-green-50 px-1.5 py-0.5 rounded text-[10px] text-green-700 font-bold border border-green-100">Cataloged</span>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="text"
                                            className="w-32 px-2 py-1 border rounded text-sm focus:ring-green-500 focus:border-green-500 outline-none text-gray-700 bg-white"
                                            value={item.modelNo}
                                            placeholder="Model No"
                                            onChange={e => handleUpdateItemCell(index, 'modelNo', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            className="w-24 px-2 py-1 border rounded text-center text-sm font-semibold text-gray-900 focus:ring-green-500 focus:border-green-500 outline-none"
                                            value={item.qty}
                                            onChange={e => handleUpdateItemCell(index, 'qty', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4 text-gray-500 font-medium">
                                        {!item.product ? (
                                            <input
                                                type="text"
                                                className="w-16 px-2 py-1 border rounded text-sm text-gray-700 focus:ring-green-500 focus:border-green-500 outline-none"
                                                value={item.unit}
                                                onChange={e => handleUpdateItemCell(index, 'unit', e.target.value)}
                                            />
                                        ) : (
                                            item.unit
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-28 px-2 py-1 border rounded text-right text-sm font-semibold text-gray-900 focus:ring-green-500 focus:border-green-500 outline-none"
                                            value={item.rate}
                                            onChange={e => handleUpdateItemCell(index, 'rate', e.target.value)}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <select
                                            className="w-20 px-1 py-1 border rounded text-sm bg-white focus:ring-green-500 focus:border-green-500 outline-none text-gray-900"
                                            value={item.gstRate}
                                            onChange={e => handleUpdateItemCell(index, 'gstRate', e.target.value)}
                                        >
                                            {['0', '5', '12', '18', '28'].map(g => (
                                                <option key={g} value={g}>{g}%</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-gray-900 text-right">
                                        ₹ {(item.rate * item.qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                                            <p className="font-semibold text-gray-500">No items added to Purchase Order yet</p>
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

                {/* General PO Metadata Form */}
                <div className="card md:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="text-md font-bold text-gray-800 border-b pb-2">PO Timeline & Remarks</h3>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">PO Date</label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2 text-sm outline-none bg-gray-50 font-medium focus:ring-green-500 focus:border-green-500"
                            value={poDate}
                            onChange={e => setPoDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Expected Delivery Date</label>
                        <input
                            type="date"
                            className="w-full border rounded px-3 py-2 text-sm outline-none bg-gray-50 font-medium focus:ring-green-500 focus:border-green-500"
                            value={expectedDeliveryDate}
                            onChange={e => setExpectedDeliveryDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Remarks / Notes</label>
                        <textarea
                            className="w-full border rounded px-3 py-2 text-sm outline-none bg-gray-50 font-medium focus:ring-green-500 focus:border-green-500 resize-none"
                            rows="3"
                            placeholder="Additional requirements or terms..."
                            value={remarks}
                            onChange={e => setRemarks(e.target.value)}
                        />
                    </div>
                </div>

                {/* Financial Breakdown & Save Action */}
                <div className="card md:col-span-2 bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200/50 space-y-4">
                    <h3 className="text-md font-bold text-gray-800 border-b pb-2">Financial Breakdown</h3>

                    <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Subtotal (Gross Item Total)</span>
                            <span className="font-mono font-bold text-slate-800">₹ {totals.subtotal.toFixed(2)}</span>
                        </div>

                        {/* CGST & SGST Split Breakup (Standard GST representation) */}
                        {activeSupplier && Object.keys(totals.taxSlabs).sort((a, b) => Number(a) - Number(b)).map(rate => {
                            const slab = totals.taxSlabs[rate];
                            return (
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
                            );
                        })}

                        {/* Round-Off Adjuster */}
                        {Math.abs(totals.roundOff) > 0 && (
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>Round Off Adjustment (R/O)</span>
                                <span className="font-mono">{totals.roundOff > 0 ? '+' : ''} ₹ {totals.roundOff.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between border-t pt-3 border-gray-300 mt-4">
                            <span className="text-lg font-bold text-slate-900">Grand Total</span>
                            <span className="text-2xl font-extrabold text-green-600 font-mono">₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleSavePO}
                            disabled={loading || items.length === 0}
                            className="btn btn-primary w-full py-4 text-base font-bold shadow-lg shadow-green-500/10 flex justify-center items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                            {loading ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <FileCheck size={20} />
                            )}
                            Save Purchase Order
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PurchaseOrder;
