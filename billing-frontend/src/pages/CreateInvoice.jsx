import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import {
    Plus,
    Trash2,
    Save,
    FileCheck,
    Calculator,
    User,
    Loader,
    FileText,
    ArrowLeft,
    Tag,
    BookOpen,
    Check,
    Receipt
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import IrrigationLoader from '../components/IrrigationLoader';

const MY_STATE_NORMALIZED = 'tamilnadu';

const DEFAULT_CATEGORIES = [
    { name: 'Drip', startCode: 1001 },
    { name: 'Automat', startCode: 501 },
    { name: 'Sprinkler', startCode: 2001 },
    { name: 'HDPE/PVC', startCode: 3001 },
    { name: 'PVC Valves', startCode: 4001 }
];

const getCategoriesList = () => {
    try {
        const saved = localStorage.getItem('products.customCategories');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                return [
                    ...DEFAULT_CATEGORIES,
                    ...parsed.filter(
                        (cc) => !DEFAULT_CATEGORIES.some((dc) => dc.name.toLowerCase() === cc.name.toLowerCase())
                    )
                ];
            }
        }
    } catch (e) {
        console.error(e);
    }
    return DEFAULT_CATEGORIES;
};

const CreateInvoice = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    const categoriesList = useMemo(() => getCategoriesList(), []);

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

    // Enhanced Manual Product State
    const [manualProduct, setManualProduct] = useState({
        productCode: '',
        name: '',
        hsn: '',
        category: 'Drip',
        unit: 'Nos',
        quantity: '1',
        sellingPrice: '',
        gstRate: '18',
        saveToCatalog: false
    });

    // Invoice Items Table State
    const [items, setItems] = useState([]);

    // Settlement & Metadata State
    const [discountPercent, setDiscountPercent] = useState(0);
    const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [ewayBillNo, setEwayBillNo] = useState('');

    // Shipping Address State
    const [isShipSameAsBill, setIsShipSameAsBill] = useState(true);
    const [shipTo, setShipTo] = useState({
        name: '',
        address: '',
        state: '',
        city: '',
        phone: ''
    });

    // Helper: Calculate Next Suggested Product Code in Category
    const getNextSuggestedCode = (catName, productList = products) => {
        const targetCat = catName || 'Drip';
        const catProducts = productList.filter(
            (p) => (p.category || '').toLowerCase() === targetCat.toLowerCase()
        );
        const foundCategory = categoriesList.find(
            (c) => c.name.toLowerCase() === targetCat.toLowerCase()
        );
        const startCode = foundCategory ? Number(foundCategory.startCode) || 1001 : 1001;

        if (catProducts.length === 0) {
            return String(startCode);
        }

        let maxNum = 0;
        catProducts.forEach((p) => {
            const codeStr = p.productCode || p.code || '';
            const match = codeStr.match(/\d+/);
            if (match) {
                const num = parseInt(match[0], 10);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        });

        return String(maxNum > 0 ? maxNum + 1 : startCode);
    };

    // Handle Manual Category Change
    const handleManualCategoryChange = (newCat) => {
        const updated = { ...manualProduct, category: newCat };
        if (updated.saveToCatalog) {
            updated.productCode = getNextSuggestedCode(newCat);
        }
        setManualProduct(updated);
    };

    // Handle Save to Catalogue Checkbox Toggle
    const handleSaveToCatalogToggle = (checked) => {
        const targetCat = manualProduct.category || 'Drip';
        const updated = {
            ...manualProduct,
            saveToCatalog: checked
        };
        if (checked && (!manualProduct.productCode || manualProduct.productCode.trim() === '')) {
            updated.productCode = getNextSuggestedCode(targetCat);
        }
        setManualProduct(updated);
    };

    // Sync customer search text with selected customer ID
    useEffect(() => {
        if (selectedCustomerId) {
            const matched = customers.find((c) => c._id === selectedCustomerId || c.id === selectedCustomerId);
            if (matched && matched.name !== customerSearchText) {
                setCustomerSearchText(matched.name);
            }
        } else {
            setCustomerSearchText('');
        }
    }, [selectedCustomerId, customers]);

    // Fetch initial master lists & existing invoice if editing
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, prodRes] = await Promise.all([api.get('/customers'), api.get('/products')]);
                setCustomers(custRes.data || []);
                setProducts(prodRes.data || []);

                if (isEditMode && id) {
                    const invRes = await api.get(`/invoices/${id}`);
                    const inv = invRes.data;
                    if (inv) {
                        setInvoiceNumber(inv.invoiceNumber || '');
                        if (inv.date) {
                            setInvoiceDate(new Date(inv.date).toISOString().split('T')[0]);
                        }
                        setEwayBillNo(inv.ewayBillNo || '');
                        setDiscountPercent(inv.discountPercent || 0);

                        if (inv.customerId) {
                            setCustomerMode('select');
                            const cId = typeof inv.customerId === 'object' ? inv.customerId._id : inv.customerId;
                            setSelectedCustomerId(cId);
                        } else {
                            setCustomerMode('manual');
                            setManualCustomer({
                                name: inv.customerName || '',
                                phone: inv.customerPhone || '',
                                gstNumber: inv.customerGSTIN || '',
                                address: inv.customerAddress || '',
                                state: inv.customerState || 'Tamil Nadu'
                            });
                        }

                        if (inv.shipTo) {
                            setIsShipSameAsBill(false);
                            setShipTo({
                                name: inv.shipTo.name || '',
                                address: inv.shipTo.address || '',
                                state: inv.shipTo.state || '',
                                city: inv.shipTo.city || '',
                                phone: inv.shipTo.phone || ''
                            });
                        }

                        if (Array.isArray(inv.items)) {
                            const formattedItems = inv.items.map((item) => ({
                                productId: item.productId?._id || item.productId || null,
                                productCode: item.productId?.productCode || item.productCode || 'Custom',
                                name: item.name || '',
                                hsn: item.hsn || '',
                                unit: item.unit || 'Nos',
                                rate: item.rate || 0,
                                gstRate: item.gstRate || 0,
                                quantity: item.qty || 1,
                                stock: item.productId?.stockQty || 9999
                            }));
                            setItems(formattedItems);
                        }
                    }
                } else {
                    try {
                        const numRes = await api.get('/invoices/next-number');
                        if (numRes.data?.nextInvoiceNumber) {
                            setInvoiceNumber(numRes.data.nextInvoiceNumber);
                        }
                    } catch (e) {
                        console.error('Auto invoice number fetch failed', e);
                    }
                }
            } catch (error) {
                console.error('Error loading master lists or invoice data', error);
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, [id, isEditMode]);

    // Add Catalog Product to Invoice
    const handleAddCatalogProduct = () => {
        if (!selectedProductCode) return;
        const matched = products.find(
            (p) => (p.productCode || p.code || '').toLowerCase() === selectedProductCode.trim().toLowerCase()
        );

        if (!matched) {
            alert('Selected product code not found in catalogue.');
            return;
        }

        const newItem = {
            productId: matched._id,
            productCode: matched.productCode || matched.code || '',
            name: matched.name,
            hsn: matched.hsn || '',
            unit: matched.unit || 'Nos',
            rate: matched.sellingPrice || 0,
            gstRate: matched.gstRate || 0,
            quantity: 1,
            stock: matched.stockQty
        };

        setItems([...items, newItem]);
        setSelectedProductCode('');
    };

    // Add Manual Product to Invoice (with optional Save to Catalogue)
    const handleAddManualProduct = async () => {
        if (!manualProduct.name || !manualProduct.sellingPrice) {
            alert('Please enter at least a Product Name and Rate.');
            return;
        }

        const qty = parseFloat(manualProduct.quantity) || 1;
        const rate = parseFloat(manualProduct.sellingPrice) || 0;
        const gstRate = parseFloat(manualProduct.gstRate) || 0;

        let createdProductId = null;
        let finalCode = (manualProduct.productCode || '').trim();

        // Auto-save to catalogue if saveToCatalog is checked OR if a specific productCode was entered
        const shouldSaveToCatalog = manualProduct.saveToCatalog || finalCode !== '';

        if (shouldSaveToCatalog) {
            if (!manualProduct.category) {
                alert('Please select a Category when saving product to catalogue.');
                return;
            }

            if (!finalCode) {
                finalCode = getNextSuggestedCode(manualProduct.category);
            }

            // Check for duplicate product code across existing products
            const isDuplicate = products.some(
                (p) => (p.productCode || p.code || '').trim().toLowerCase() === finalCode.toLowerCase()
            );

            if (isDuplicate) {
                alert(`⚠️ Product code "${finalCode}" already exists in the catalogue. Please choose another code.`);
                return;
            }

            const payload = {
                productCode: finalCode,
                name: manualProduct.name.trim(),
                hsn: manualProduct.hsn ? manualProduct.hsn.trim() : '',
                category: manualProduct.category,
                unit: manualProduct.unit || 'Nos',
                gstRate: gstRate,
                sellingPrice: rate,
                purchasePrice: 0,
                stockQty: qty,
                reorderLevel: 5
            };

            try {
                const res = await api.post('/products', payload);
                const savedProduct = res.data;
                createdProductId = savedProduct._id || savedProduct.id;

                // Add saved product to in-memory products list
                setProducts((prev) => [...prev, savedProduct]);
                alert(`Product "${payload.name}" (${finalCode}) successfully saved to Product Catalogue.`);
            } catch (error) {
                alert('Product could not be saved to catalogue: ' + (error.response?.data?.error || error.message));
                return;
            }
        }

        const newItem = {
            productId: createdProductId,
            productCode: finalCode || 'Custom',
            name: manualProduct.name,
            hsn: manualProduct.hsn || '-',
            unit: manualProduct.unit || 'Nos',
            rate: rate,
            gstRate: gstRate,
            quantity: qty,
            stock: createdProductId ? qty : 9999
        };

        setItems([...items, newItem]);

        // Reset manual product form
        setManualProduct({
            productCode: '',
            name: '',
            hsn: '',
            category: 'Drip',
            unit: 'Nos',
            quantity: '1',
            sellingPrice: '',
            gstRate: '18',
            saveToCatalog: false
        });
    };

    // Save individual unsaved table item to Product Catalogue
    const handleSaveItemToCatalog = async (index) => {
        const item = items[index];
        if (item.productId) {
            alert('This item is already saved in the product catalogue.');
            return;
        }

        const cat = manualProduct.category || 'Drip';
        const suggestCode = getNextSuggestedCode(cat);
        const codeInput = prompt(`Enter Product Code to save "${item.name}" to Catalogue:`, item.productCode && item.productCode !== 'Custom' ? item.productCode : suggestCode);
        if (!codeInput) return;

        const code = codeInput.trim();
        const isDuplicate = products.some(
            (p) => (p.productCode || p.code || '').trim().toLowerCase() === code.toLowerCase()
        );

        if (isDuplicate) {
            alert(`⚠️ Product code "${code}" already exists in the catalogue.`);
            return;
        }

        const payload = {
            productCode: code,
            name: item.name.trim(),
            hsn: item.hsn && item.hsn !== '-' ? item.hsn.trim() : '',
            category: cat,
            unit: item.unit || 'Nos',
            gstRate: item.gstRate || 0,
            sellingPrice: item.rate || 0,
            purchasePrice: 0,
            stockQty: item.quantity || 100,
            reorderLevel: 5
        };

        try {
            const res = await api.post('/products', payload);
            const savedProduct = res.data;
            const newProdId = savedProduct._id || savedProduct.id;

            setProducts((prev) => [...prev, savedProduct]);

            // Update item in table
            const updatedItems = [...items];
            updatedItems[index].productId = newProdId;
            updatedItems[index].productCode = code;
            setItems(updatedItems);

            alert(`Product "${item.name}" (${code}) successfully saved to Product Catalogue!`);
        } catch (error) {
            alert('Failed to save product to catalogue: ' + (error.response?.data?.error || error.message));
        }
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
        const subtotal = items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
        const discountAmount = subtotal * (parseFloat(discountPercent) / 100 || 0);
        const taxableTotal = subtotal - discountAmount;

        const taxableFactor = subtotal > 0 ? taxableTotal / subtotal : 1;

        let totalGST = 0;
        const taxSlabs = {};

        items.forEach((item) => {
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
            alert('Please select a customer.');
            return;
        }
        if (customerMode === 'manual' && !manualCustomer.name) {
            alert('Please enter a manual customer name.');
            return;
        }
        if (!invoiceNumber || !invoiceNumber.trim()) {
            alert('Please enter a mandatory Invoice Number.');
            return;
        }
        if (items.length === 0) {
            alert('Please add at least one item to the invoice.');
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

            items: items.map((item) => ({
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
            shipTo,
            ewayBillNo: ewayBillNo || null
        };

        try {
            if (isEditMode && id) {
                await api.put(`/invoices/${id}`, payload);
                alert('Invoice updated successfully!');
            } else {
                await api.post('/invoices', payload);
                alert('Invoice created successfully!');
            }
            navigate('/invoices');
        } catch (error) {
            console.error('Direct Invoice Save/Update Failed', error);
            alert(error.response?.data?.error || 'Failed to save invoice.');
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <IrrigationLoader message="Initializing direct billing catalog..." />
            </div>
        );
    }

    // Filter reference products for manual product category
    const categoryRefProducts = products.filter(
        (p) => (p.category || '').toLowerCase() === (manualProduct.category || 'Drip').toLowerCase()
    );

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Top Toolbar */}
            <div className="flex justify-between items-center no-print">
                <button
                    onClick={() => navigate('/invoices')}
                    className="btn btn-outline bg-white flex items-center gap-2 text-xs font-bold rounded-xl"
                >
                    <ArrowLeft size={16} /> Back to Invoices
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Mode:</span>
                    <span className="badge badge-success text-xs font-bold">
                        {isEditMode ? 'Editing Invoice' : 'Direct Billing Engine'}
                    </span>
                </div>
            </div>

            {/* Header / Invoice Number Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Receipt size={24} className="text-indigo-600" />
                        {isEditMode ? `Edit Invoice ${invoiceNumber}` : 'Create Direct Invoice'}
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                        Fine Flow Irrigation point-of-sale & Tax invoice generator
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Invoice No *
                        </label>
                        <input
                            type="text"
                            required
                            className="h-10 border border-slate-300 rounded-xl px-3 text-sm font-mono font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder="e.g. FFI/2026/001"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Invoice Date
                        </label>
                        <input
                            type="date"
                            className="h-10 border border-slate-300 rounded-xl px-3 text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            E-Way Bill No
                        </label>
                        <input
                            type="text"
                            className="h-10 border border-slate-300 rounded-xl px-3 text-sm font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                            value={ewayBillNo}
                            onChange={(e) => setEwayBillNo(e.target.value)}
                            placeholder="Optional 12-digit E-Way No"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. CUSTOMER SELECTION SECTION */}
                <div className="card lg:col-span-1 border-t-4 border-indigo-600 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <User size={18} className="text-indigo-600" /> Customer Information
                        </h3>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => setCustomerMode('select')}
                                className={`px-2.5 py-1 rounded-md transition-all ${
                                    customerMode === 'select'
                                        ? 'bg-white shadow-xs text-indigo-600'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                Registered
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomerMode('manual')}
                                className={`px-2.5 py-1 rounded-md transition-all ${
                                    customerMode === 'manual'
                                        ? 'bg-white shadow-xs text-indigo-600'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                Walk-In / Manual
                            </button>
                        </div>
                    </div>

                    {customerMode === 'select' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Search Customer Directory *
                                </label>
                                <input
                                    list="customer-list"
                                    type="text"
                                    placeholder="Type customer name or phone..."
                                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                                    value={customerSearchText}
                                    onChange={(e) => {
                                        setCustomerSearchText(e.target.value);
                                        const match = customers.find(
                                            (c) => c.name.toLowerCase() === e.target.value.toLowerCase()
                                        );
                                        if (match) setSelectedCustomerId(match._id || match.id);
                                    }}
                                />
                                <datalist id="customer-list">
                                    {customers.map((c) => (
                                        <option key={c._id || c.id} value={c.name}>
                                            {c.phone ? `(${c.phone})` : ''} - {c.state || 'Tamil Nadu'}
                                        </option>
                                    ))}
                                </datalist>
                            </div>

                            {selectedCustomerId && (
                                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1">
                                    {(() => {
                                        const c = customers.find(
                                            (cust) => cust._id === selectedCustomerId || cust.id === selectedCustomerId
                                        );
                                        if (!c) return null;
                                        return (
                                            <>
                                                <p className="font-bold text-slate-900">{c.name}</p>
                                                <p className="text-slate-600">GSTIN: {c.gstNumber || 'URD'}</p>
                                                <p className="text-slate-600">Phone: {c.phone || '-'}</p>
                                                <p className="text-slate-500 text-[11px]">{c.address}, {c.state}</p>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Customer Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-9 border border-slate-200 rounded-xl px-3 text-sm font-semibold"
                                    placeholder="Customer or Firm Name"
                                    value={manualCustomer.name}
                                    onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        GSTIN / URD
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs font-mono uppercase"
                                        placeholder="GSTIN or URD"
                                        value={manualCustomer.gstNumber}
                                        onChange={(e) =>
                                            setManualCustomer({ ...manualCustomer, gstNumber: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border border-slate-200 rounded-xl px-3 text-xs"
                                        placeholder="Phone"
                                        value={manualCustomer.phone}
                                        onChange={(e) =>
                                            setManualCustomer({ ...manualCustomer, phone: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Billing Address
                                </label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-xl p-2 text-xs resize-none"
                                    rows="2"
                                    placeholder="Address details"
                                    value={manualCustomer.address}
                                    onChange={(e) =>
                                        setManualCustomer({ ...manualCustomer, address: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* Shipping Address Accordion */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Shipping Address Same as Billing?</span>
                            <input
                                type="checkbox"
                                checked={isShipSameAsBill}
                                onChange={(e) => setIsShipSameAsBill(e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                        </div>

                        {!isShipSameAsBill && (
                            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                        Receiver Name
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full h-8 border rounded-lg px-2 bg-white"
                                        value={shipTo.name}
                                        onChange={(e) => setShipTo({ ...shipTo, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                        Shipping Address
                                    </label>
                                    <textarea
                                        className="w-full h-12 border rounded-lg p-2 bg-white resize-none"
                                        value={shipTo.address}
                                        onChange={(e) => setShipTo({ ...shipTo, address: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                            City
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full h-8 border rounded-lg px-2 bg-white"
                                            value={shipTo.city || ''}
                                            onChange={(e) => setShipTo({ ...shipTo, city: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                            State
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full h-8 border rounded-lg px-2 bg-white"
                                            value={shipTo.state}
                                            onChange={(e) => setShipTo({ ...shipTo, state: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. PRODUCT ADDITION SECTION */}
                <div className="card lg:col-span-2 border-t-4 border-indigo-600 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            <Calculator size={20} className="text-indigo-600" /> Add Items to Invoice
                        </h3>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setProductMode('select')}
                                className={`px-3 py-1 rounded-md transition-all ${
                                    productMode === 'select'
                                        ? 'bg-white shadow-xs text-indigo-600'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                Search Catalog
                            </button>
                            <button
                                type="button"
                                onClick={() => setProductMode('manual')}
                                className={`px-3 py-1 rounded-md transition-all ${
                                    productMode === 'manual'
                                        ? 'bg-white shadow-xs text-indigo-600'
                                        : 'text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                Manual Custom Product
                            </button>
                        </div>
                    </div>

                    {productMode === 'select' ? (
                        <div className="flex gap-3 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Search Catalogue Product
                                </label>
                                <input
                                    list="product-list"
                                    type="text"
                                    placeholder="Type product code or name..."
                                    className="w-full h-10 border border-slate-300 rounded-xl px-3 bg-white text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                                    value={selectedProductCode}
                                    onChange={(e) => setSelectedProductCode(e.target.value)}
                                />
                                <datalist id="product-list">
                                    {products.map((p) => (
                                        <option key={p._id || p.id} value={p.productCode || p.code || ''}>
                                            {p.name} - ₹{p.sellingPrice} - (Category: {p.category || 'Drip'})
                                        </option>
                                    ))}
                                </datalist>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddCatalogProduct}
                                className="btn btn-primary h-10 shadow-md flex items-center justify-center px-5 text-xs font-bold rounded-xl"
                            >
                                <Plus size={18} /> Add Item
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                {/* Category Selection */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Category {manualProduct.saveToCatalog && <span className="text-rose-500">*</span>}
                                    </label>
                                    <select
                                        className="w-full h-9 border border-slate-300 rounded-xl px-3 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                                        value={manualProduct.category || 'Drip'}
                                        onChange={(e) => handleManualCategoryChange(e.target.value)}
                                    >
                                        {categoriesList.map((c) => (
                                            <option key={c.name} value={c.name}>
                                                {c.name} (Code {c.startCode}+)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Product Code */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Product Code {manualProduct.saveToCatalog && <span className="text-rose-500">*</span>}
                                        </label>
                                        {manualProduct.saveToCatalog && (
                                            <span className="text-[9px] text-indigo-600 font-bold">Suggested</span>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full h-9 border border-slate-300 rounded-xl px-3 bg-white text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                                        placeholder={
                                            manualProduct.saveToCatalog
                                                ? `e.g. ${getNextSuggestedCode(manualProduct.category || 'Drip')}`
                                                : 'e.g. Custom'
                                        }
                                        value={manualProduct.productCode}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setManualProduct({
                                                ...manualProduct,
                                                productCode: val,
                                                saveToCatalog: val.trim() !== '' ? true : manualProduct.saveToCatalog
                                            });
                                        }}
                                    />
                                </div>

                                {/* Product Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Product Name *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border border-slate-300 rounded-xl px-3 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Detailed item description"
                                        value={manualProduct.name}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, name: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                {/* HSN Code */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        HSN Code
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border border-slate-300 rounded-xl px-3 bg-white text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g. 8424"
                                        value={manualProduct.hsn}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, hsn: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Unit */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Unit *
                                    </label>
                                    <select
                                        className="w-full h-9 border border-slate-300 rounded-xl px-2 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                                        value={manualProduct.unit}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, unit: e.target.value })
                                        }
                                    >
                                        {['Nos', 'Pcs', 'Box', 'Set', 'Mtr', 'SqFt', 'Kg', 'Ltr', 'Bag', 'Dozen', 'Roll'].map(
                                            (u) => (
                                                <option key={u} value={u}>
                                                    {u}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        className="w-full h-9 border border-slate-300 rounded-xl px-3 bg-white text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500"
                                        value={manualProduct.quantity || 1}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, quantity: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Rate */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        Rate (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full h-9 border border-slate-300 rounded-xl px-3 bg-white text-xs font-bold text-right text-slate-900 focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Selling Rate"
                                        value={manualProduct.sellingPrice}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, sellingPrice: e.target.value })
                                        }
                                    />
                                </div>

                                {/* GST % */}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                        GST Rate %
                                    </label>
                                    <select
                                        className="w-full h-9 border border-slate-300 rounded-xl px-2 bg-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                                        value={manualProduct.gstRate}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, gstRate: e.target.value })
                                        }
                                    >
                                        {['0', '5', '12', '18', '28'].map((g) => (
                                            <option key={g} value={g}>
                                                {g}%
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Add Button */}
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={handleAddManualProduct}
                                        className="btn btn-primary h-9 w-full flex items-center justify-center gap-1.5 shadow-md text-xs font-bold rounded-xl"
                                    >
                                        <Plus size={16} /> Add Product
                                    </button>
                                </div>
                            </div>

                            {/* SAVE TO CATALOGUE CHECKBOX */}
                            <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                        checked={manualProduct.saveToCatalog || false}
                                        onChange={(e) => handleSaveToCatalogToggle(e.target.checked)}
                                    />
                                    <span className="text-xs font-bold text-slate-700">
                                        Save this product to permanent Product Catalogue
                                    </span>
                                </label>

                                {manualProduct.saveToCatalog && (
                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        Will save code{' '}
                                        <strong>
                                            {manualProduct.productCode ||
                                                getNextSuggestedCode(manualProduct.category || 'Drip')}
                                        </strong>{' '}
                                        to catalogue
                                    </span>
                                )}
                            </div>

                            {/* COMPACT CATEGORY REFERENCE PANEL */}
                            {manualProduct.category && (
                                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 font-bold text-slate-700">
                                        <span className="flex items-center gap-1.5 text-indigo-600">
                                            <Tag size={13} /> Existing "{manualProduct.category}" Products Reference
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            Next Suggested Code:{' '}
                                            <strong className="text-emerald-600 font-bold">
                                                {getNextSuggestedCode(manualProduct.category)}
                                            </strong>
                                        </span>
                                    </div>

                                    {categoryRefProducts.length > 0 ? (
                                        <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1 font-mono text-[11px] pr-1">
                                            {categoryRefProducts.slice(0, 15).map((p) => (
                                                <div
                                                    key={p._id || p.id}
                                                    className="flex justify-between items-center py-1 px-2 border-b border-slate-50 hover:bg-slate-50 rounded"
                                                >
                                                    <span className="font-bold text-slate-800">
                                                        {p.productCode || p.code || '-'}
                                                    </span>
                                                    <span className="text-slate-600 truncate max-w-[220px] font-sans">
                                                        {p.name}
                                                    </span>
                                                    <span className="text-slate-500">₹{p.sellingPrice}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-slate-400 italic">
                                            No existing products in "{manualProduct.category}" yet. Starting code:{' '}
                                            {getNextSuggestedCode(manualProduct.category)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. INVOICE ITEMS TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between border-b pb-3">
                    <span>Invoice Items Billed ({items.length})</span>
                    {items.length > 0 && (
                        <span className="text-xs text-indigo-600 font-bold">
                            Subtotal: ₹{totals.subtotal.toLocaleString('en-IN')}
                        </span>
                    )}
                </h3>

                {items.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                        <FileText size={48} className="mx-auto mb-2 opacity-20" />
                        <p className="font-semibold text-slate-500">No items added to invoice yet.</p>
                        <p className="text-xs">Search catalog or enter a manual product above.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="p-3">Item Name</th>
                                    <th className="p-3">HSN</th>
                                    <th className="p-3">Qty</th>
                                    <th className="p-3">Unit</th>
                                    <th className="p-3">Rate (₹)</th>
                                    <th className="p-3">GST %</th>
                                    <th className="p-3 text-right">Amount (₹)</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {items.map((item, idx) => {
                                    const amount = item.rate * item.quantity;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="p-3">
                                                <div className="font-bold text-slate-900">{item.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        Code: {item.productCode || 'Custom'}
                                                    </span>
                                                    {item.productId ? (
                                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                                            In Catalogue
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveItemToCatalog(idx)}
                                                            className="text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.2 rounded border border-indigo-200 transition-colors"
                                                            title="Click to save product to permanent catalogue"
                                                        >
                                                            + Save to Catalogue
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 font-mono text-slate-600">{item.hsn || '-'}</td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="any"
                                                    className="w-16 border rounded px-2 py-1 font-bold text-center"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateItemCell(idx, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 text-slate-600">{item.unit || 'Nos'}</td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-24 border rounded px-2 py-1 font-semibold text-right"
                                                    value={item.rate}
                                                    onChange={(e) => handleUpdateItemCell(idx, 'rate', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-16 border rounded px-2 py-1 text-center font-semibold"
                                                    value={item.gstRate}
                                                    onChange={(e) => handleUpdateItemCell(idx, 'gstRate', e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3 text-right font-bold text-slate-900">
                                                ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 4. TOTALS & SAVE BAR */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2 w-full md:w-1/2">
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Special Discount (%):
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-20 border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-center"
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(e.target.value)}
                        />
                    </div>

                    {Object.keys(totals.taxSlabs).length > 0 && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                            <p className="font-bold text-slate-700">GST Breakdown:</p>
                            {Object.entries(totals.taxSlabs).map(([slab, data]) => (
                                <div key={slab} className="flex justify-between text-slate-600 font-mono">
                                    <span>
                                        GST {slab}% (Taxable: ₹{data.taxable.toFixed(2)})
                                    </span>
                                    <span>₹{data.tax.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-80 space-y-2 text-right">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-semibold text-slate-800">₹{totals.subtotal.toFixed(2)}</span>
                    </div>
                    {totals.discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-emerald-600">
                            <span>Discount ({discountPercent}%):</span>
                            <span>-₹{totals.discountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Taxable Amount:</span>
                        <span className="font-semibold text-slate-800">₹{totals.taxableTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Total GST:</span>
                        <span className="font-semibold text-slate-800">₹{totals.totalGST.toFixed(2)}</span>
                    </div>
                    {totals.roundOff !== 0 && (
                        <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Round Off:</span>
                            <span>{totals.roundOff > 0 ? `+₹${totals.roundOff.toFixed(2)}` : `-₹${Math.abs(totals.roundOff).toFixed(2)}`}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-black text-slate-900 border-t pt-2">
                        <span>Grand Total:</span>
                        <span className="text-indigo-600">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="pt-3">
                        <button
                            type="button"
                            onClick={handleSaveInvoice}
                            disabled={loading || items.length === 0}
                            className="btn btn-primary w-full py-3.5 shadow-lg shadow-indigo-600/20 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader size={20} className="animate-spin" />
                            ) : (
                                <>
                                    <FileCheck size={20} />
                                    {isEditMode ? 'Update Invoice' : 'Generate Direct Invoice'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateInvoice;
