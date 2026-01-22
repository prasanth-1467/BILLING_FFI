import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Plus, Trash2, Save, FileCheck, Calculator, User, Loader, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usePersistentState from '../hooks/usePersistentState';

// Treat Tamil Nadu as the home/intra state.
// We normalize by removing spaces and comparing case-insensitively.
const MY_STATE_NORMALIZED = 'tamilnadu';

const Quotation = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    // Form State (persistent between page navigations)
    const [selectedCustomerId, setSelectedCustomerId] = usePersistentState('quotation.selectedCustomerId', '');
    const [selectedProductCode, setSelectedProductCode] = usePersistentState('quotation.selectedProductCode', '');
    const [items, setItems] = usePersistentState('quotation.items', []);
    const [discountPercent, setDiscountPercent] = usePersistentState('quotation.discountPercent', 0);
    const [lastSavedQuoteId, setLastSavedQuoteId] = usePersistentState('quotation.lastSavedQuoteId', '');

    // Ship To State
    const [isShipSameAsBill, setIsShipSameAsBill] = usePersistentState('quotation.isShipSameAsBill', true);
    const [shipTo, setShipTo] = usePersistentState('quotation.shipTo', {
        name: '',
        address: '',
        state: '',
        city: '',
        phone: ''
    });

    // Derived State
    const selectedCustomer = useMemo(
        () => customers.find(c => c._id === selectedCustomerId || c.id === selectedCustomerId),
        [customers, selectedCustomerId]
    );

    const isIntraState = (() => {
        if (!selectedCustomer?.state) return false;
        const normalized = selectedCustomer.state.replace(/\s+/g, '').toLowerCase();
        return normalized === MY_STATE_NORMALIZED;
    })();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [custRes, prodRes] = await Promise.all([
                    api.get('/customers'),
                    api.get('/products')
                ]);
                setCustomers(custRes.data);
                setProducts(prodRes.data);
            } catch (error) {
                console.error("Error loading data", error);
            }
        };
        fetchData();
    }, []);

    // Sync ShipTo with BillTo
    useEffect(() => {
        if (isShipSameAsBill && selectedCustomer) {
            setShipTo({
                name: selectedCustomer.name,
                address: selectedCustomer.address,
                state: selectedCustomer.state,
                city: '', // Assuming city isn't explicitly separated in customer model yet, or add if available
                phone: selectedCustomer.phone
            });
        }
    }, [isShipSameAsBill, selectedCustomer, setShipTo]);

    const handleAddProduct = () => {
        const product = products.find(p =>
            p._id === selectedProductCode ||
            p.productCode === selectedProductCode ||
            p.code === selectedProductCode
        );
        if (!product) return;

        const existingItem = items.find(i => i.productId === product._id || i.productCode === (product.productCode || product.code));
        if (existingItem) {
            alert("Product already added! Adjust quantity in the table.");
            return;
        }

        const newItem = {
            productId: product._id,
            productCode: product.productCode || product.code,
            name: product.name,
            unit: product.unit,
            rate: product.sellingPrice,
            gstRate: product.gstRate,
            quantity: 1,
            stock: product.stockQty ?? product.stock
        };

        setItems([...items, newItem]);
        setSelectedProductCode('');
    };

    const updateQuantity = (index, qty) => {
        const newItems = [...items];
        newItems[index].quantity = parseFloat(qty) || 0;
        setItems(newItems);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Calculations
    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + (item.rate * item.quantity), 0);
        const discountAmount = subtotal * (discountPercent / 100);
        const taxableTotal = subtotal - discountAmount;

        // Calculate GST per item (prorated discount) & Aggregate Slabs
        const taxableFactor = subtotal > 0 ? (taxableTotal / subtotal) : 1;

        let totalGST = 0;
        const taxSlabs = {}; // { 18: { taxable: 0, tax: 0 } }

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

    const handleSave = async () => {
        if (!selectedCustomerId || items.length === 0) {
            alert("Please select a customer and add at least one item.");
            return;
        }

        setLoading(true);
        const payload = {
            customerId: selectedCustomerId,
            items: items.map(item => ({
                productId: item.productId,
                qty: item.quantity,
                rate: item.rate,
                gstRate: item.gstRate,
                amount: item.quantity * item.rate
            })),
            discountPercent: parseFloat(discountPercent),
            shipTo // Add shipTo to payload
        };

        try {
            const res = await api.post('/quotations', payload);
            const quoteId = res?.data?._id || res?.data?.id;
            if (quoteId) setLastSavedQuoteId(quoteId);
            alert('Quotation Saved Successfully!');
        } catch (error) {
            console.error('Save failed', error);
            alert('Failed to save quotation.');
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

    return (
        <div className="space-y-6 pb-20">
            {/* Top Actions */}
            <div className="flex justify-end">
                <button
                    className="btn btn-outline bg-white flex items-center gap-2"
                    onClick={() => navigate('/quotations')}
                >
                    <FileText size={18} /> View Saved Quotations
                </button>
            </div>

            {/* Top Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Selection */}
                <div className="card lg:col-span-1 border-t-4 border-blue-500">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <User size={20} /> Customer Details
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
                            <select
                                className="w-full"
                                value={selectedCustomerId}
                                onChange={e => setSelectedCustomerId(e.target.value)}
                            >
                                <option value="">-- Choose Customer --</option>
                                {customers.map((c, idx) => {
                                    const key = c._id || c.id || c.gstNumber || c.phone || idx;
                                    const val = c._id || c.id || '';
                                    return (
                                        <option key={key} value={val}>{c.name}</option>
                                    );
                                })}
                            </select>
                        </div>
                        {selectedCustomer && (
                            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                                <p><strong>State:</strong> {selectedCustomer.state} {isIntraState ? '(Intra-state)' : '(Inter-state)'}</p>
                                <p><strong>GSTIN:</strong> {selectedCustomer.gstNumber}</p>
                            </div>
                        )}
                    </div>

                    {/* Ship To Section */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-gray-700">Ship To</h4>
                            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-xs checkbox-primary"
                                    checked={isShipSameAsBill}
                                    onChange={e => setIsShipSameAsBill(e.target.checked)}
                                />
                                Same as Bill To
                            </label>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Receivers Name</label>
                                <input
                                    type="text"
                                    className="w-full text-sm py-1 px-2 border-b focus:border-blue-500 outline-none"
                                    value={shipTo.name}
                                    onChange={e => setShipTo({ ...shipTo, name: e.target.value })}
                                    disabled={isShipSameAsBill}
                                    placeholder="Receiver Name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Shipping Address</label>
                                <textarea
                                    className="w-full text-sm py-1 px-2 border-b focus:border-blue-500 outline-none resize-none"
                                    rows="2"
                                    value={shipTo.address}
                                    onChange={e => setShipTo({ ...shipTo, address: e.target.value })}
                                    disabled={isShipSameAsBill}
                                    placeholder="Address"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">City</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm py-1 px-2 border-b focus:border-blue-500 outline-none"
                                        value={shipTo.city || ''}
                                        onChange={e => setShipTo({ ...shipTo, city: e.target.value })}
                                        disabled={isShipSameAsBill}
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase">State</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm py-1 px-2 border-b focus:border-blue-500 outline-none"
                                        value={shipTo.state}
                                        onChange={e => setShipTo({ ...shipTo, state: e.target.value })}
                                        disabled={isShipSameAsBill}
                                        placeholder="State"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Entry */}
                <div className="card lg:col-span-2 border-t-4 border-indigo-500">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Calculator size={20} /> Add Items
                    </h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Code / Name</label>
                            <input
                                list="product-list"
                                type="text"
                                placeholder="Type to search..."
                                value={selectedProductCode}
                                onChange={e => setSelectedProductCode(e.target.value)}
                            />
                            <datalist id="product-list">
                                {products.map((p, idx) => {
                                    const key = p._id || p.productCode || p.code || idx;
                                    return (
                                        <option
                                            key={key}
                                            value={p.productCode || p.code || p._id || ''}
                                        >
                                            {(p.productCode || p.code || 'Code')} - {p.name} - ₹{p.sellingPrice}
                                        </option>
                                    );
                                })}
                            </datalist>
                        </div>
                        <button
                            onClick={handleAddProduct}
                            className="btn btn-primary h-[38px]" /* Match input height roughly */
                        >
                            <Plus size={18} /> Add
                        </button>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="card overflow-hidden border-t-4 border-gray-500">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th className="w-32">Qty</th>
                                <th>Unit</th>
                                <th>Rate</th>
                                <th>Amount</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-xs text-gray-500">Code: {item.productCode} | GST: {item.gstRate}%</div>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            className="w-full py-1 px-2"
                                            value={item.quantity}
                                            onChange={(e) => updateQuantity(index, e.target.value)}
                                        />
                                    </td>
                                    <td>{item.unit}</td>
                                    <td>₹ {item.rate}</td>
                                    <td className="font-semibold">₹ {(item.rate * item.quantity).toFixed(2)}</td>
                                    <td>
                                        <button onClick={() => removeItem(index)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-400">
                                        No items added yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer / Calculations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    {/* Notes or Standard Terms could go here */}
                </div>
                <div className="card bg-gray-50 space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">₹ {totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Discount (%)</span>
                        <input
                            type="number"
                            className="w-20 text-right py-1 px-2 h-8"
                            value={discountPercent}
                            onChange={e => setDiscountPercent(Math.max(0, e.target.value))}
                        />
                    </div>
                    <div className="flex justify-between border-b pb-3 border-gray-200">
                        <span className="text-gray-600">Taxable Amount</span>
                        <span className="font-medium">₹ {totals.taxableTotal.toFixed(2)}</span>
                    </div>

                    {/* GST Breakup */}
                    {/* GST Breakup */}
                    {selectedCustomer && (
                        Object.keys(totals.taxSlabs).sort((a, b) => Number(a) - Number(b)).map(rate => {
                            const slab = totals.taxSlabs[rate];
                            return isIntraState ? (
                                <React.Fragment key={rate}>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>CGST @ {Number(rate) / 2}%</span>
                                        <span>+ ₹ {(slab.tax / 2).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>SGST @ {Number(rate) / 2}%</span>
                                        <span>+ ₹ {(slab.tax / 2).toFixed(2)}</span>
                                    </div>
                                </React.Fragment>
                            ) : (
                                <div key={rate} className="flex justify-between text-sm text-gray-600">
                                    <span>IGST @ {rate}%</span>
                                    <span>+ ₹ {slab.tax.toFixed(2)}</span>
                                </div>
                            );
                        })
                    )}

                    {/* Round Off Display */}
                    {Math.abs(totals.roundOff) > 0 && (
                        <div className="flex justify-between text-sm text-gray-500 mt-2">
                            <span>Round Off (R/O)</span>
                            <span>{totals.roundOff > 0 ? '+' : ''} ₹ {totals.roundOff.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between border-t pt-3 border-gray-300 mt-2">
                        <span className="text-lg font-bold text-gray-900">Grand Total</span>
                        <span className="text-xl font-bold text-blue-600">₹ {totals.grandTotal.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="btn btn-primary w-full py-3"
                        >
                            {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                            Save Quotation
                        </button>
                        <button
                            className="btn btn-outline w-full py-3 bg-white"
                            onClick={handleConvertToInvoice}
                            disabled={loading || !lastSavedQuoteId}
                            title={!lastSavedQuoteId ? 'Save the quotation first' : 'Convert this quotation to an invoice'}
                        >
                            <FileCheck size={18} /> Convert to Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Quotation;
