import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Plus, Trash2, Save, FileCheck, Calculator, User, Loader, FileText, ArrowLeft, Tag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import usePersistentState from '../hooks/usePersistentState';
import { useToast } from '../context/ToastContext';

// Treat Tamil Nadu as the home/intra state.
// We normalize by removing spaces and comparing case-insensitively.
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

const Quotation = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    const categoriesList = useMemo(() => getCategoriesList(), []);

    // --- Direct Quotation Creator State ---
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
    const [selectedProductCode, setSelectedProductCode] = usePersistentState('quotation_v3.selectedProductCode', '');
    
    // Enhanced Manual Product State (mirrors Invoice module)
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

    // Quotation Items Table State
    const [items, setItems] = usePersistentState('quotation_v3.items', []);
    const [discountPercent, setDiscountPercent] = usePersistentState('quotation_v3.discountPercent', 0);
    const [quoteNumber, setQuoteNumber] = useState('');
    const [lastSavedQuoteId, setLastSavedQuoteId] = usePersistentState('quotation_v3.lastSavedQuoteId', '');

    // Ship To State
    const [isShipSameAsBill, setIsShipSameAsBill] = usePersistentState('quotation_v3.isShipSameAsBill', true);
    const [includeShippingAddress, setIncludeShippingAddress] = usePersistentState('quotation_v3.includeShippingAddress', true);
    const [shipTo, setShipTo] = usePersistentState('quotation_v3.shipTo', {
        name: '',
        address: '',
        state: '',
        city: '',
        phone: ''
    });

    // Sync Customer search text with Selected ID
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

    // Derived State - Active selectedCustomer
    const selectedCustomer = useMemo(() => {
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

    const isIntraState = useMemo(() => {
        if (!selectedCustomer?.state) return false;
        const normalized = selectedCustomer.state.replace(/\s+/g, '').toLowerCase();
        return normalized === MY_STATE_NORMALIZED;
    }, [selectedCustomer]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, prodRes] = await Promise.all([
                    api.get('/customers'),
                    api.get('/products')
                ]);
                setCustomers(custRes.data || []);
                setProducts(prodRes.data || []);

                if (isEditMode && id) {
                    const quoteRes = await api.get(`/quotations/${id}`);
                    const q = quoteRes.data;
                    if (q) {
                        setQuoteNumber(q.quoteNumber || '');
                        setDiscountPercent(q.discountPercent || 0);

                        if (q.customerId) {
                            setCustomerMode('select');
                            const cId = typeof q.customerId === 'object' ? q.customerId._id : q.customerId;
                            setSelectedCustomerId(cId);
                        } else {
                            setCustomerMode('manual');
                            setManualCustomer({
                                name: q.customerName || '',
                                phone: q.customerPhone || '',
                                gstNumber: q.customerGSTIN || '',
                                address: q.customerAddress || '',
                                state: q.customerState || 'Tamil Nadu'
                            });
                        }

                        if (q.includeShippingAddress !== undefined) {
                            setIncludeShippingAddress(q.includeShippingAddress);
                        }

                        if (q.shipTo) {
                            setIsShipSameAsBill(false);
                            setShipTo({
                                name: q.shipTo.name || '',
                                address: q.shipTo.address || '',
                                state: q.shipTo.state || '',
                                city: q.shipTo.city || '',
                                phone: q.shipTo.phone || ''
                            });
                        }

                        if (Array.isArray(q.items)) {
                            const formattedItems = q.items.map((item) => ({
                                productId: item.productId?._id || item.productId || null,
                                productCode: item.productCode || item.productId?.productCode || item.productId?.code || 'Custom',
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
                }
            } catch (error) {
                console.error("Error loading data or quotation", error);
            } finally {
                setPageLoading(false);
            }
        };
        fetchData();
    }, [id, isEditMode]);

    // Sync ShipTo with Active billing details
    useEffect(() => {
        if (isShipSameAsBill && selectedCustomer) {
            setShipTo({
                name: selectedCustomer.name || '',
                address: selectedCustomer.address || '',
                state: selectedCustomer.state || '',
                city: '',
                phone: selectedCustomer.phone || ''
            });
        }
    }, [isShipSameAsBill, selectedCustomer, setShipTo]);

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

    // Category Reference Products for Reference Panel
    const categoryRefProducts = useMemo(() => {
        const targetCat = manualProduct.category || 'Drip';
        return products.filter(
            (p) => (p.category || '').toLowerCase() === targetCat.toLowerCase()
        );
    }, [products, manualProduct.category]);

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

    // Add Custom Manual Product (with optional Save to Catalogue)
    const handleAddManualProduct = async () => {
        if (!manualProduct.name || !manualProduct.sellingPrice) {
            alert("Please enter at least a Product Name and Rate.");
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
                showToast({
                    title: 'Product Saved to Catalogue',
                    description: `Product "${payload.name}" (${finalCode}) successfully saved.`,
                    type: 'success'
                });
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

            showToast({
                title: 'Product Saved to Catalogue',
                description: `Product "${item.name}" (${code}) successfully saved!`,
                type: 'success'
            });
        } catch (error) {
            alert('Failed to save product to catalogue: ' + (error.response?.data?.error || error.message));
        }
    };

    // Remove item from table
    const removeItem = (index) => {
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

    // Calculations
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

    // Handle Save Quotation Submit
    const handleSave = async () => {
        if (customerMode === 'select' && !selectedCustomerId) {
            alert("Please select a customer.");
            return;
        }
        if (customerMode === 'manual' && !manualCustomer.name) {
            alert("Please enter a manual customer name.");
            return;
        }
        if (!quoteNumber || !quoteNumber.trim()) {
            alert("Please enter a mandatory Quotation Number.");
            return;
        }
        if (items.length === 0) {
            alert("Please add at least one item to the quotation.");
            return;
        }

        setLoading(true);

        const payload = {
            quoteNumber: quoteNumber ? quoteNumber.trim() : null,
            customerId: customerMode === 'select' ? selectedCustomerId : null,
            
            // Manual customer fields
            customerName: customerMode === 'manual' ? manualCustomer.name : null,
            customerGSTIN: customerMode === 'manual' ? manualCustomer.gstNumber || 'URD' : null,
            customerAddress: customerMode === 'manual' ? manualCustomer.address : null,
            customerState: customerMode === 'manual' ? manualCustomer.state : null,
            customerPhone: customerMode === 'manual' ? manualCustomer.phone : null,
            
            items: items.map(item => ({
                productId: item.productId,
                productCode: item.productCode,
                name: item.name,
                hsn: item.hsn,
                unit: item.unit,
                qty: item.quantity,
                rate: item.rate,
                gstRate: item.gstRate,
                amount: item.quantity * item.rate
            })),
            discountPercent: parseFloat(discountPercent) || 0,
            includeShippingAddress,
            shipTo
        };

        try {
            if (isEditMode && id) {
                await api.put(`/quotations/${id}`, payload);
                showToast({
                    title: 'Quotation Updated',
                    description: `Quotation details saved successfully.`,
                    type: 'quotation'
                });
                navigate('/quotations');
            } else {
                const res = await api.post('/quotations', payload);
                const quoteId = res?.data?._id || res?.data?.id;
                const qNum = res?.data?.quoteNumber || quoteNumber || 'New';
                if (quoteId) setLastSavedQuoteId(quoteId);

                // Clear form on success
                setItems([]);
                setSelectedCustomerId('');
                setCustomerSearchText('');
                setManualCustomer({ name: '', phone: '', gstNumber: '', address: '', state: 'Tamil Nadu' });
                setDiscountPercent(0);
                setQuoteNumber('');
                setIsShipSameAsBill(true);
                setShipTo({ name: '', address: '', state: '', city: '', phone: '' });

                showToast({
                    title: 'Quotation Generated',
                    description: `Quotation #${qNum} prepared and ready for conversion.`,
                    type: 'quotation'
                });
                navigate('/quotations');
            }
        } catch (error) {
            console.error('Save failed', error);
            showToast({
                title: 'Quotation Save Failed',
                description: error.response?.data?.error || 'Failed to save quotation.',
                type: 'alert'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToInvoice = async () => {
        const quoteId = lastSavedQuoteId;
        if (!quoteId) {
            alert('Please save the quotation first, then convert to invoice.');
            return;
        }
        setLoading(true);
        try {
            await api.post(`/invoices/from-quotation/${quoteId}`, {
                paymentType: 'Cash',
                paidAmount: 0
            });
            alert('Invoice added');
            navigate('/invoices');
        } catch (error) {
            console.error('Convert to invoice failed', error);
            alert('Failed to convert quotation to invoice.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear the entire form?")) {
            setItems([]);
            setSelectedCustomerId('');
            setCustomerSearchText('');
            setManualCustomer({ name: '', phone: '', gstNumber: '', address: '', state: 'Tamil Nadu' });
            setDiscountPercent(0);
            setQuoteNumber('');
            setIsShipSameAsBill(true);
            setShipTo({ name: '', address: '', state: '', city: '', phone: '' });
            setLastSavedQuoteId('');
        }
    };

    if (pageLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
                <Loader className="animate-spin text-[#FF7A18]" size={28} />
                <p className="text-xs font-semibold text-[#94A3B8]">Loading quotation details...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Top Actions */}
            <div className="flex justify-between items-center no-print">
                <button
                    className="btn btn-outline bg-[#111726] flex items-center gap-2 text-xs font-bold rounded-xl"
                    onClick={() => navigate('/quotations')}
                >
                    <ArrowLeft size={16} /> Back to Quotations List
                </button>
                <div className="flex items-center gap-2">
                    <span className="badge badge-info text-xs font-bold">
                        {isEditMode ? `Editing Quotation: ${quoteNumber}` : 'New Quotation Creator'}
                    </span>
                    <button
                        className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 text-xs rounded-xl"
                        onClick={handleReset}
                    >
                        Reset Form
                    </button>
                </div>
            </div>

            {/* Split Grid: Customer & Catalog/Product Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. CUSTOMER SECTION */}
                <div className="card lg:col-span-1 border-t-4 border-[#FF7A18] bg-[#111726] p-5 rounded-2xl shadow-sm border border-[#1F2B45]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                            <User size={20} className="text-[#FF7A18]" /> Customer Details
                        </h3>
                        <div className="flex bg-[#172033] p-0.5 rounded-lg text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setCustomerMode('select')}
                                className={`px-3 py-1 rounded-md transition-all ${customerMode === 'select' ? 'bg-[#111726] shadow-sm text-[#FF7A18]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                            >
                                Select
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomerMode('manual')}
                                className={`px-3 py-1 rounded-md transition-all ${customerMode === 'manual' ? 'bg-[#111726] shadow-sm text-[#FF7A18]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                            >
                                Manual
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {customerMode === 'select' ? (
                            <div>
                                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Search Customer Directory</label>
                                <input
                                    list="customer-list"
                                    type="text"
                                    placeholder="Type customer name to search..."
                                    className="w-full h-10 border border-[#1F2B45] rounded-lg px-3 bg-[#111726] text-sm"
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
                                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Customer Name *</label>
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
                                        <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Phone</label>
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
                                        <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">GSTIN</label>
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
                                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Billing State *</label>
                                    <select
                                        className="w-full border rounded px-3 py-2 text-sm bg-[#111726]"
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
                                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Billing Address</label>
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

                        {customerMode === 'select' && selectedCustomer && (
                            <div className="bg-[#172033] p-4 border border-[#1F2B45] rounded-xl text-sm space-y-1.5 mt-2">
                                <p className="font-semibold text-[#FF7A18]">{selectedCustomer.name}</p>
                                <p className="text-[#94A3B8]"><strong className="text-[#F8FAFC]">Phone:</strong> {selectedCustomer.phone || '-'}</p>
                                <p className="text-[#94A3B8]"><strong className="text-[#F8FAFC]">State:</strong> {selectedCustomer.state} {isIntraState ? '(Intra-state split)' : '(Inter-state IGST)'}</p>
                                <p className="text-[#94A3B8]"><strong className="text-[#F8FAFC]">GSTIN:</strong> <span className="font-mono text-xs text-[#FF7A18] font-bold">{selectedCustomer.gstNumber || 'URD'}</span></p>
                            </div>
                        )}
                    </div>

                    {/* Ship To Segment */}
                    <div className="mt-6 pt-4 border-t border-[#1F2B45] space-y-3">
                        {/* Include Shipping Address Toggle Switch */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#172033] border border-[#1F2B45]">
                            <div>
                                <span className="text-xs font-bold text-[#F8FAFC] block">Include Shipping Address</span>
                                <span className="text-[10px] text-[#94A3B8] block">Controls whether Ship To appears in PDF</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIncludeShippingAddress(!includeShippingAddress)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    includeShippingAddress ? 'bg-[#FF7A18]' : 'bg-[#1F2B45]'
                                }`}
                                role="switch"
                                aria-checked={includeShippingAddress}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        includeShippingAddress ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {includeShippingAddress && (
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-[#F8FAFC] text-sm">Shipping Details</h4>
                                <label className="flex items-center gap-1.5 text-xs text-[#94A3B8] cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded border-[#1F2B45] w-3 h-3 text-[#FF7A18] focus:ring-[#FF7A18]"
                                        checked={isShipSameAsBill}
                                        onChange={e => setIsShipSameAsBill(e.target.checked)}
                                    />
                                    Same as Billing Address
                                </label>
                            </div>
                        )}

                        {includeShippingAddress && !isShipSameAsBill && (
                            <div className="space-y-2.5">
                                <div>
                                    <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase mb-0.5">Receiver Name</label>
                                    <input
                                        type="text"
                                        className="w-full text-xs py-1 px-2 border rounded"
                                        value={shipTo.name}
                                        onChange={e => setShipTo({ ...shipTo, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase mb-0.5">Shipping Address</label>
                                    <textarea
                                        className="w-full text-xs py-1 px-2 border rounded resize-none"
                                        rows="2"
                                        value={shipTo.address}
                                        onChange={e => setShipTo({ ...shipTo, address: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase mb-0.5">City</label>
                                        <input
                                            type="text"
                                            className="w-full text-xs py-1 px-2 border rounded"
                                            value={shipTo.city || ''}
                                            onChange={e => setShipTo({ ...shipTo, city: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-semibold text-[#94A3B8] uppercase mb-0.5">State</label>
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
                <div className="card lg:col-span-2 border-t-4 border-[#FF7A18] bg-[#111726] p-5 rounded-2xl shadow-sm border border-[#1F2B45]">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
                            <Calculator size={20} className="text-[#FF7A18]" /> Add Items to Quotation
                        </h3>
                        <div className="flex bg-[#172033] p-0.5 rounded-lg text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setProductMode('select')}
                                className={`px-3 py-1 rounded-md transition-all ${productMode === 'select' ? 'bg-[#111726] shadow-sm text-[#FF7A18]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                            >
                                Search Catalog
                            </button>
                            <button
                                type="button"
                                onClick={() => setProductMode('manual')}
                                className={`px-3 py-1 rounded-md transition-all ${productMode === 'manual' ? 'bg-[#111726] shadow-sm text-[#FF7A18]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                            >
                                Manual Custom Product
                            </button>
                        </div>
                    </div>

                    {productMode === 'select' ? (
                        <div className="flex gap-4 items-end bg-[#172033] p-4 rounded-xl border border-[#1F2B45]">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">Search Catalog Product</label>
                                <input
                                    list="product-list"
                                    type="text"
                                    placeholder="Type code or name..."
                                    className="w-full h-10 border border-[#1F2B45] rounded-lg px-3 bg-[#111726]"
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
                                className="btn btn-primary h-10 shadow-md flex items-center justify-center px-6"
                            >
                                <Plus size={18} /> Add Catalog
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 bg-[#172033] p-4 rounded-2xl border border-[#1F2B45]">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                {/* Category Selection */}
                                <div>
                                    <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                                        Category {manualProduct.saveToCatalog && <span className="text-rose-500">*</span>}
                                    </label>
                                    <select
                                        className="w-full h-9 border border-[#1F2B45] rounded-xl px-3 bg-[#111726] text-xs font-semibold focus:ring-2 focus:ring-[#FF7A18]"
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
                                        <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                                            Product Code {manualProduct.saveToCatalog && <span className="text-rose-500">*</span>}
                                        </label>
                                        {manualProduct.saveToCatalog && (
                                            <span className="text-[9px] text-[#FF7A18] font-bold">Suggested</span>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full h-9 border border-[#1F2B45] rounded-xl px-3 bg-[#111726] text-xs font-mono font-bold focus:ring-2 focus:ring-[#FF7A18]"
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
                                    <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                                        Product Name *
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border border-[#1F2B45] rounded-xl px-3 bg-[#111726] text-xs font-semibold focus:ring-2 focus:ring-[#FF7A18]"
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
                                    <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                                        HSN Code
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full h-9 border border-[#1F2B45] rounded-xl px-3 bg-[#111726] text-xs font-mono focus:ring-2 focus:ring-[#FF7A18]"
                                        placeholder="e.g. 8424"
                                        value={manualProduct.hsn}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, hsn: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Unit */}
                                <div>
                                    <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                                        Unit *
                                    </label>
                                    <select
                                        className="w-full h-9 border border-[#1F2B45] rounded-xl px-2 bg-[#111726] text-xs font-medium focus:ring-2 focus:ring-[#FF7A18]"
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
                                    <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                                        Quantity *
                                    </label>
                                    <input
                                        type="number"
                                        step="1"
                                        className="w-full h-9 border border-[#1F2B45] rounded-xl px-3 bg-[#111726] text-xs font-bold text-center focus:ring-2 focus:ring-[#FF7A18]"
                                        value={manualProduct.quantity || 1}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, quantity: e.target.value })
                                        }
                                    />
                                </div>

                                {/* Rate */}
                                <div>
                                    <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                                        Rate (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full h-9 border border-[#1F2B45] rounded-xl px-3 bg-[#111726] text-xs font-bold text-right text-[#F8FAFC] focus:ring-2 focus:ring-[#FF7A18]"
                                        placeholder="Selling Rate"
                                        value={manualProduct.sellingPrice}
                                        onChange={(e) =>
                                            setManualProduct({ ...manualProduct, sellingPrice: e.target.value })
                                        }
                                    />
                                </div>

                                {/* GST % */}
                                <div>
                                    <label className="block text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                                        GST Rate %
                                    </label>
                                    <select
                                        className="w-full h-9 border border-[#1F2B45] rounded-xl px-2 bg-[#111726] text-xs font-semibold focus:ring-2 focus:ring-[#FF7A18]"
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
                            <div className="pt-2 flex items-center justify-between border-t border-[#1F2B45]/60">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="rounded text-[#FF7A18] focus:ring-[#FF7A18] w-4 h-4 cursor-pointer"
                                        checked={manualProduct.saveToCatalog || false}
                                        onChange={(e) => handleSaveToCatalogToggle(e.target.checked)}
                                    />
                                    <span className="text-xs font-bold text-[#F8FAFC]">
                                        Save this product to permanent Product Catalogue
                                    </span>
                                </label>

                                {manualProduct.saveToCatalog && (
                                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800">
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
                                <div className="bg-[#111726] p-3 rounded-xl border border-[#1F2B45] text-xs space-y-2">
                                    <div className="flex justify-between items-center border-b border-[#1F2B45] pb-1.5 font-bold text-[#F8FAFC]">
                                        <span className="flex items-center gap-1.5 text-[#FF7A18]">
                                            <Tag size={13} /> Existing "{manualProduct.category}" Products Reference
                                        </span>
                                        <span className="text-[10px] text-[#94A3B8] font-mono">
                                            Next Suggested Code:{' '}
                                            <strong className="text-emerald-400 font-bold">
                                                {getNextSuggestedCode(manualProduct.category)}
                                            </strong>
                                        </span>
                                    </div>

                                    {categoryRefProducts.length > 0 ? (
                                        <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1 font-mono text-[11px] pr-1">
                                            {categoryRefProducts.slice(0, 15).map((p) => (
                                                <div
                                                    key={p._id || p.id}
                                                    className="flex justify-between items-center py-1 px-2 border-b border-[#1F2B45] hover:bg-[#172033] rounded"
                                                >
                                                    <span className="font-bold text-[#F8FAFC]">
                                                        {p.productCode || p.code || '-'}
                                                    </span>
                                                    <span className="text-[#94A3B8] truncate max-w-[220px] font-sans">
                                                        {p.name}
                                                    </span>
                                                    <span className="text-[#94A3B8]">₹{p.sellingPrice}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[11px] text-[#64748B] italic">
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

            {/* 3. ITEMS TABLE */}
            <div className="card bg-[#111726] rounded-2xl shadow-sm border border-[#1F2B45] overflow-hidden">
                <div className="p-4 border-b border-[#1F2B45] bg-[#172033]/50">
                    <h3 className="text-md font-bold text-[#F8FAFC]">Quotation Items List</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-[#172033]/80 border-b border-[#1F2B45] text-xs uppercase tracking-wider text-[#94A3B8]">
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
                        <tbody className="divide-y divide-[#1F2B45]">
                            {items.map((item, index) => (
                                <tr key={index} className="table-record-row hover:bg-[#FFF0E5] dark:hover:bg-[#172033]/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-[#F8FAFC]">{item.name}</div>
                                        <div className="text-xs text-[#94A3B8] mt-0.5 flex items-center">
                                            Code: <span className="font-semibold text-[#F8FAFC] ml-1">{item.productCode}</span> 
                                            {item.productId ? (
                                                <span className="ml-2 bg-[#FF7A18]/15 px-1.5 py-0.5 rounded text-[10px] text-[#FF7A18] font-bold border border-[#FF7A18]/30">Cataloged</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveItemToCatalog(index)}
                                                    className="ml-2 text-[10px] font-bold text-[#FF7A18] bg-[#FF7A18]/15 hover:bg-[#FF7A18]/25 px-1.5 py-0.5 rounded border border-[#FF7A18]/30 transition-colors"
                                                    title="Click to save product to permanent catalogue"
                                                >
                                                    + Save to Catalogue
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="font-mono text-xs bg-[#172033] px-1.5 py-0.5 rounded text-[#94A3B8] font-semibold border border-[#1F2B45]">{item.hsn}</span>
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
                                    <td className="p-4 text-[#94A3B8] font-medium">{item.unit}</td>
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
                                            className="w-20 px-1 py-1 border rounded text-sm bg-[#111726]"
                                            value={item.gstRate}
                                            onChange={e => handleUpdateItemCell(index, 'gstRate', e.target.value)}
                                        >
                                            {['0', '5', '12', '18', '28'].map(g => (
                                                <option key={g} value={g}>{g}%</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-[#F8FAFC] text-right">
                                        ₹ {(item.rate * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="text-[#EF4444] hover:bg-[#EF4444]/15 p-2 rounded-md transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center py-12 text-[#64748B]">
                                        <div className="flex flex-col items-center">
                                            <FileText size={48} className="mb-3 opacity-20" />
                                            <p className="font-semibold text-[#94A3B8]">No items added to quotation yet</p>
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
                <div className="card md:col-span-1 bg-[#111726] p-5 rounded-2xl shadow-sm border border-[#1F2B45] space-y-4">
                    <h3 className="text-md font-bold text-[#F8FAFC] border-b border-[#1F2B45] pb-2">Quotation Details</h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Quotation Number *</label>
                        <input
                            type="text"
                            placeholder="Enter Mandatory Quote Number"
                            className="w-full border rounded px-3 py-2 text-sm outline-none bg-[#172033] font-medium uppercase"
                            required
                            value={quoteNumber}
                            onChange={e => setQuoteNumber(e.target.value)}
                        />
                    </div>
                </div>

                {/* Calculations Panel & Save/Convert Actions */}
                <div className="card md:col-span-2 bg-[#172033] p-6 rounded-2xl shadow-sm border border-[#1F2B45]/50 space-y-4">
                    <h3 className="text-md font-bold text-[#F8FAFC] border-b pb-2">Financial Breakdown</h3>
                    
                    <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#94A3B8]">Subtotal (Gross Item Total)</span>
                            <span className="font-mono font-bold text-[#F8FAFC]">₹ {totals.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[#111726] p-2.5 rounded-xl border border-[#1F2B45]/60 shadow-xs hover:border-[#FF7A18]/40 transition-all">
                            <span className="text-[#94A3B8] font-semibold text-xs uppercase tracking-wider">Discount Percentage</span>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-24 pl-3 pr-8 py-1 border border-[#1F2B45] rounded-lg text-right font-bold text-sm text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#FF7A18] focus:border-[#FF7A18] bg-[#172033] hover:bg-[#172033]/50 transition-colors"
                                    value={discountPercent}
                                    onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                />
                                <span className="absolute right-3 text-[#64748B] font-bold text-sm pointer-events-none">%</span>
                            </div>
                        </div>
                        {totals.discountAmount > 0 && (
                            <div className="flex justify-between text-xs text-green-600">
                                <span>Discount Amount</span>
                                <span className="font-mono font-bold">- ₹ {totals.discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-b pb-2 border-[#1F2B45]">
                            <span className="text-[#94A3B8]">Taxable Net Amount</span>
                            <span className="font-mono font-bold text-[#F8FAFC]">₹ {totals.taxableTotal.toFixed(2)}</span>
                        </div>

                        {/* GST Breakup */}
                        {selectedCustomer && (
                            Object.keys(totals.taxSlabs).sort((a, b) => Number(a) - Number(b)).map(rate => {
                                const slab = totals.taxSlabs[rate];
                                return isIntraState ? (
                                    <React.Fragment key={rate}>
                                        <div className="flex justify-between text-xs text-[#94A3B8]">
                                            <span>CGST @ {Number(rate) / 2}% (on ₹ {slab.taxable.toFixed(2)})</span>
                                            <span className="font-mono">+ ₹ {(slab.tax / 2).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-[#94A3B8]">
                                            <span>SGST @ {Number(rate) / 2}% (on ₹ {slab.taxable.toFixed(2)})</span>
                                            <span className="font-mono">+ ₹ {(slab.tax / 2).toFixed(2)}</span>
                                        </div>
                                    </React.Fragment>
                                ) : (
                                    <div key={rate} className="flex justify-between text-xs text-[#94A3B8]">
                                        <span>IGST @ {rate}% (on ₹ {slab.taxable.toFixed(2)})</span>
                                        <span className="font-mono">+ ₹ {slab.tax.toFixed(2)}</span>
                                    </div>
                                );
                            })
                        )}

                        {/* Round-Off Adjuster */}
                        {Math.abs(totals.roundOff) > 0 && (
                            <div className="flex justify-between text-xs text-[#94A3B8] mt-2">
                                <span>Round Off Adjustment (R/O)</span>
                                <span className="font-mono">{totals.roundOff > 0 ? '+' : ''} ₹ {totals.roundOff.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between border-t pt-3 border-[#1F2B45] mt-4">
                            <span className="text-lg font-bold text-[#F8FAFC]">Grand Total Payable</span>
                            <span className="text-2xl font-extrabold text-[#FF7A18] font-mono">₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#1F2B45]">
                        <button
                            onClick={handleSave}
                            disabled={loading || items.length === 0}
                            className="btn btn-primary w-full py-4 text-base font-bold shadow-lg shadow-[#FF7A18]/20 flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
                            {isEditMode ? 'Update Quotation' : 'Save Quotation'}
                        </button>
                        <button
                            onClick={handleConvertToInvoice}
                            disabled={loading || !lastSavedQuoteId}
                            className="btn btn-outline w-full py-4 text-base font-bold bg-[#111726] shadow-md flex justify-center items-center gap-2"
                            title={!lastSavedQuoteId ? 'Save the quotation first' : 'Convert this quotation to an invoice'}
                        >
                            <FileCheck size={20} /> Convert to Invoice
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Quotation;
