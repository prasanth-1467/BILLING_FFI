import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Plus, Trash2, Save, ShoppingCart, Loader, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PurchaseOrder = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);

    // Form Stats
    const [selectedSupplierId, setSelectedSupplierId] = useState(localStorage.getItem('po_supplierId') || '');
    const [poDate, setPoDate] = useState(localStorage.getItem('po_date') || new Date().toISOString().split('T')[0]);
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(localStorage.getItem('po_expectedDeliveryDate') || '');
    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('po_items');
        return saved ? JSON.parse(saved) : [];
    });
    const [remarks, setRemarks] = useState(localStorage.getItem('po_remarks') || '');

    // Persist form data
    useEffect(() => {
        localStorage.setItem('po_supplierId', selectedSupplierId);
        localStorage.setItem('po_date', poDate);
        localStorage.setItem('po_expectedDeliveryDate', expectedDeliveryDate);
        localStorage.setItem('po_items', JSON.stringify(items));
        localStorage.setItem('po_remarks', remarks);
    }, [selectedSupplierId, poDate, expectedDeliveryDate, items, remarks]);

    // Auto-generated PO Number (frontend placeholder)
    const [poNumber, setPoNumber] = useState(`PO-${Date.now()}`);

    // Product Entry State
    const [selectedProductCode, setSelectedProductCode] = useState('');

    // New Supplier Modal State
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: '', phone: '', email: '', gstin: '', address: '' });

    const selectedSupplier = useMemo(
        () => suppliers.find(s => s._id === selectedSupplierId || s.id === selectedSupplierId),
        [suppliers, selectedSupplierId]
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [suppRes, prodRes] = await Promise.all([
                    api.get('/suppliers'), // Assuming this endpoint exists based on supplierRoutes.js
                    api.get('/products')
                ]);
                setSuppliers(suppRes.data);
                setProducts(prodRes.data);
            } catch (error) {
                console.error("Error loading data", error);
            }
        };
        fetchData();
    }, []);

    const handleAddProduct = () => {
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
            productCode: product.productCode || product.code,
            name: product.name,
            modelNo: '', // Initialize empty manul field
            unit: product.unit,
            qty: 1,
            rate: product.purchasePrice || 0,
            gstRate: product.gstRate || 5 // Default to 5 if not set
        };

        setItems([...items, newItem]);
        setSelectedProductCode('');
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleAddSupplier = async () => {
        if (!newSupplier.name || !newSupplier.gstin) {
            alert("Name and GSTIN (15 chars) are required.");
            return;
        }
        try {
            const res = await api.post('/suppliers', newSupplier);
            setSuppliers([res.data, ...suppliers]);
            setSelectedSupplierId(res.data._id);
            setShowSupplierModal(false);
            setNewSupplier({ name: '', phone: '', email: '', gstin: '', address: '' });
            alert("Supplier added successfully!");
        } catch (error) {
            alert(error.response?.data?.error || "Failed to add supplier");
        }
    };

    const handleDeleteSupplier = async () => {
        if (!selectedSupplierId || selectedSupplierId === 'ADD_NEW') return;

        if (window.confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
            try {
                await api.delete(`/suppliers/${selectedSupplierId}`); // Assuming route is created

                // Update UI
                setSuppliers(suppliers.filter(s => s._id !== selectedSupplierId));
                setSelectedSupplierId(''); // Deselect
                alert("Supplier deleted successfully.");
            } catch (error) {
                console.error("Delete failed", error);
                alert("Failed to delete supplier.");
            }
        }
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!selectedSupplierId) {
            alert("Please select a supplier.");
            return;
        }
        if (items.length === 0) {
            alert("Please add at least one item.");
            return;
        }

        setLoading(true);
        const payload = {
            poNumber,
            supplier: selectedSupplierId,
            date: poDate,
            expectedDeliveryDate: expectedDeliveryDate || null,
            items: items.map(item => ({
                product: item.product,
                modelNo: item.modelNo,
                qty: parseFloat(item.qty),
                unit: item.unit,
                rate: parseFloat(item.rate),
                gstRate: parseFloat(item.gstRate)
            })),
            remarks,
            status: 'Draft' // Default status
        };

        try {
            await api.post('/purchase-orders', payload);
            // Clear local storage on success
            localStorage.removeItem('po_supplierId');
            localStorage.removeItem('po_date');
            localStorage.removeItem('po_expectedDeliveryDate');
            localStorage.removeItem('po_items');
            localStorage.removeItem('po_remarks');

            alert('Purchase Order Saved Successfully!');
            navigate('/'); // Navigate to dashboard or PO list if available
        } catch (error) {
            console.error('Save failed', error);
            alert('Failed to save Purchase Order: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Create Purchase Order</h2>
                <h2 className="text-2xl font-bold text-gray-800">Create Purchase Order</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <label className="font-semibold">PO #:</label>
                    <input
                        type="text"
                        className="font-mono font-bold text-gray-900 border-b border-gray-300 focus:border-blue-500 focus:outline-none w-40 text-right"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                    />
                    <span className="text-xs text-orange-500 ml-2 hidden sm:inline">(Editable)</span>
                </div>
            </div>

            {/* Top Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Supplier Selection */}
                <div className="card lg:col-span-1 border-t-4 border-green-500">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <ShoppingCart size={20} /> Supplier
                        </h3>
                        {selectedSupplier && (
                            <button
                                onClick={handleDeleteSupplier}
                                className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                                title="Delete Supplier"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Supplier <span className="text-red-500">*</span></label>
                            <select
                                className="w-full form-select border-gray-300 rounded-md shadow-sm focus:border-green-500 focus:ring focus:ring-green-200"
                                value={selectedSupplierId}
                                onChange={e => {
                                    if (e.target.value === 'ADD_NEW') {
                                        setShowSupplierModal(true);
                                    } else {
                                        setSelectedSupplierId(e.target.value);
                                    }
                                }}
                            >
                                <option value="">-- Choose Supplier --</option>
                                <option value="ADD_NEW" className="font-bold text-green-600">+ Add New Supplier</option>
                                {suppliers.map((s, idx) => (
                                    <option key={s._id || idx} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        {selectedSupplier && (
                            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                <p><strong>GSTIN:</strong> {selectedSupplier.gstin || 'N/A'}</p>
                                <p><strong>Email:</strong> {selectedSupplier.email || 'N/A'}</p>
                                <p><strong>Phone:</strong> {selectedSupplier.phone || 'N/A'}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">PO Date</label>
                                <input
                                    type="date"
                                    className="w-full text-sm py-1 px-2 border rounded"
                                    value={poDate}
                                    onChange={e => setPoDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase">Exp. Delivery</label>
                                <input
                                    type="date"
                                    className="w-full text-sm py-1 px-2 border rounded"
                                    value={expectedDeliveryDate}
                                    onChange={e => setExpectedDeliveryDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Product Entry */}
                <div className="card lg:col-span-2 border-t-4 border-indigo-500">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Plus size={20} /> Add Items
                    </h3>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                            <input
                                list="product-list"
                                type="text"
                                placeholder="Search product..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                value={selectedProductCode}
                                onChange={e => setSelectedProductCode(e.target.value)}
                            />
                            <datalist id="product-list">
                                {products.map((p, idx) => (
                                    <option
                                        key={p._id || idx}
                                        value={p.productCode || p.code || p._id}
                                    >
                                        {p.name}
                                    </option>
                                ))}
                            </datalist>
                        </div>
                        <button
                            onClick={handleAddProduct}
                            className="btn btn-primary h-[42px]"
                        >
                            <Plus size={18} /> Add Item
                        </button>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="card overflow-hidden border-t-4 border-gray-500">
                <div className="table-container">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Model No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">GST %</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-normal max-w-xs">
                                        <div className="text-sm font-medium text-gray-900 break-words">{item.name}</div>
                                        <div className="text-sm text-gray-500">{item.productCode}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="text"
                                            placeholder="Model / Part No"
                                            className="w-full px-2 py-1 border rounded focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                                            style={{ color: '#000000', backgroundColor: '#ffffff' }}
                                            value={item.modelNo}
                                            onChange={(e) => updateItem(index, 'modelNo', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full px-2 py-1 border rounded focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                                            style={{ color: '#000000', backgroundColor: '#ffffff' }}
                                            value={item.gstRate}
                                            onChange={(e) => updateItem(index, 'gstRate', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full px-2 py-1 border rounded focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                                            style={{ color: '#000000', backgroundColor: '#ffffff' }}
                                            value={item.qty}
                                            onChange={(e) => updateItem(index, 'qty', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.unit}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-2 py-1 border rounded focus:ring-blue-500 focus:border-blue-500 text-black bg-white"
                                            style={{ color: '#000000', backgroundColor: '#ffffff' }}
                                            value={item.rate}
                                            onChange={(e) => updateItem(index, 'rate', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => removeItem(index)} className="text-red-600 hover:text-red-900">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No items added to this Purchase Order yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Remarks & Footer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks / Notes</label>
                    <textarea
                        className="w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        rows="4"
                        placeholder="Enter any additional notes here..."
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                    ></textarea>
                </div>
                <div className="flex flex-col justify-end">
                    <button
                        onClick={handleSave}
                        disabled={loading || !selectedSupplierId || items.length === 0}
                        className={`w-full py-3 px-4 rounded-md shadow flex items-center justify-center gap-2 text-white font-medium transition-colors ${loading || !selectedSupplierId || items.length === 0
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {loading ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
                        Save Purchase Order
                    </button>
                    {!selectedSupplierId && (
                        <p className="text-xs text-red-500 mt-2 text-center">Please select a supplier to proceed.</p>
                    )}
                </div>
            </div>


            {/* Add Supplier Modal */}
            {
                showSupplierModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                            <h3 className="text-lg font-bold mb-4">Add New Supplier</h3>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Supplier Name *"
                                    className="w-full p-2 border rounded"
                                    value={newSupplier.name}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Phone (10 digits)"
                                    className="w-full p-2 border rounded"
                                    value={newSupplier.phone}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="GSTIN (15 chars) *"
                                    className="w-full p-2 border rounded uppercase"
                                    value={newSupplier.gstin}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value.toUpperCase() })}
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className="w-full p-2 border rounded"
                                    value={newSupplier.email}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                                />
                                <textarea
                                    placeholder="Address"
                                    className="w-full p-2 border rounded"
                                    rows="2"
                                    value={newSupplier.address}
                                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                                />
                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        onClick={() => setShowSupplierModal(false)}
                                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddSupplier}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Save Supplier
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default PurchaseOrder;
