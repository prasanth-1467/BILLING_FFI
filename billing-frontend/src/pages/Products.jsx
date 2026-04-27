import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Loader, Edit, Trash2, Package, AlertTriangle, AlertCircle, TrendingUp, CheckSquare, Settings } from 'lucide-react';
import usePersistentState from '../hooks/usePersistentState';

const CATEGORIES = ["Automat", "Drip Accessories", "Filters", "HDPE", "Lateral", "Valves"];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = usePersistentState('products.searchTerm', '');
  const [categoryFilter, setCategoryFilter] = usePersistentState('products.categoryFilter', 'All');
  const [stockFilter, setStockFilter] = usePersistentState('products.stockFilter', 'All');

  // Form & Selection
  const [showForm, setShowForm] = usePersistentState('products.showForm', false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Bulk Action State
  const [bulkAction, setBulkAction] = useState("");
  const [bulkActionValue, setBulkActionValue] = useState("");

  const [form, setForm] = usePersistentState('products.form', {
    productCode: '',
    name: '',
    hsn: '',
    category: 'General',
    unit: '',
    gstRate: '',
    sellingPrice: '',
    stockQty: '',
    reorderLevel: 5
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        productCode: form.productCode,
        name: form.name,
        hsn: form.hsn,
        category: form.category || 'General',
        unit: form.unit,
        gstRate: Number(form.gstRate) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        stockQty: Number(form.stockQty) || 0,
        reorderLevel: Number(form.reorderLevel) || 5
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }

      if (payload.stockQty <= payload.reorderLevel) {
        alert(`⚠️ Alert: Product "${payload.name}" is low or out of stock (${payload.stockQty} remaining).`);
      }

      setForm({ productCode: '', name: '', hsn: '', category: 'General', unit: '', gstRate: '', sellingPrice: '', stockQty: '', reorderLevel: 5 });
      setShowForm(false);
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product', error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setForm({
      productCode: product.productCode || product.code || '',
      name: product.name || '',
      hsn: product.hsn || '',
      category: product.category || 'General',
      unit: product.unit || '',
      gstRate: product.gstRate || '',
      sellingPrice: product.sellingPrice || '',
      stockQty: product.stockQty || '',
      reorderLevel: product.reorderLevel || 5
    });
    setEditingId(product._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        setSelectedIds(selectedIds.filter(selId => selId !== id));
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product', error);
      }
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction) return;

    if (bulkAction === 'delete' && !window.confirm(`Are you sure you want to delete ${selectedIds.length} products?`)) {
      return;
    }

    try {
      const data = {};
      if (bulkAction === 'update_gst') data.gstRate = bulkActionValue;
      else if (bulkAction === 'update_category') data.category = bulkActionValue;
      else if (bulkAction === 'update_price') data.sellingPrice = bulkActionValue;

      await api.post('/products/bulk-action', {
        action: bulkAction,
        productIds: selectedIds,
        data
      });

      setSelectedIds([]);
      setBulkAction("");
      setBulkActionValue("");
      fetchProducts();
    } catch (error) {
      console.error('Bulk action failed', error);
      alert('Bulk action failed');
    }
  };

  const handleInlineEdit = async (id, field, value) => {
    try {
      await api.put(`/products/${id}`, { [field]: value });
      setProducts(products.map(p => (p._id === id ? { ...p, [field]: value } : p)));
    } catch (error) {
      console.error(`Failed to update ${field}`, error);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selId => selId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p._id));
    }
  };

  const filteredProducts = products.filter((p) => {
    const name = (p?.name || '').toLowerCase();
    const code = (p?.productCode || p?.code || '').toLowerCase();
    const cat = (p?.category || '').toLowerCase();
    const term = (searchTerm || '').toLowerCase();

    const matchesSearch = name.includes(term) || code.includes(term) || cat.includes(term);
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;

    const isOutOfStock = p.stockQty <= 0;
    const isLowStock = p.stockQty > 0 && p.stockQty <= (p.reorderLevel || 5);
    const isInStock = p.stockQty > (p.reorderLevel || 5);

    let matchesStock = true;
    if (stockFilter === 'Out of Stock') matchesStock = isOutOfStock;
    else if (stockFilter === 'Low Stock') matchesStock = isLowStock;
    else if (stockFilter === 'In Stock') matchesStock = isInStock;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const totalStockValue = products.reduce((acc, p) => acc + ((p.stockQty || 0) * (p.sellingPrice || 0)), 0);
  const outOfStockCount = products.filter(p => p.stockQty <= 0).length;
  const lowStockCount = products.filter(p => p.stockQty > 0 && p.stockQty <= (p.reorderLevel || 5)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Loader className="animate-spin mr-2" /> Loading inventory...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Products</p>
            <h3 className="text-2xl font-bold text-gray-900">{products.length}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Stock Value</p>
            <h3 className="text-2xl font-bold text-gray-900">₹{totalStockValue.toLocaleString()}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Low Stock</p>
            <h3 className="text-2xl font-bold text-gray-900">{lowStockCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Out of Stock</p>
            <h3 className="text-2xl font-bold text-gray-900">{outOfStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Top Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-1 gap-4 items-center">
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Search name, code, category..."
              className="pl-10 w-full h-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="h-10 border-gray-200 rounded-lg text-sm px-3 appearance-none bg-gray-50 cursor-pointer hover:bg-gray-100"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="h-10 border-gray-200 rounded-lg text-sm px-3 appearance-none bg-gray-50 cursor-pointer hover:bg-gray-100"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="All">All Stock Status</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
        <button className="btn btn-primary shadow-md hover:shadow-lg transition-shadow" onClick={() => {
          setEditingId(null);
          setForm({ productCode: '', name: '', hsn: '', category: 'General', unit: '', gstRate: '', sellingPrice: '', stockQty: '', reorderLevel: 5 });
          setShowForm(true);
        }}>
          + Add Product
        </button>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckSquare className="text-blue-600" size={20} />
            <span className="font-semibold text-blue-800">{selectedIds.length} Products Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border-gray-200 rounded text-sm px-3 py-1.5"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Choose bulk action...</option>
              <option value="update_category">Update Category</option>
              <option value="update_gst">Update GST %</option>
              {/* <option value="update_price">Update Selling Price</option> */}
              <option value="delete">Delete Selected</option>
            </select>

            {bulkAction === 'update_category' && (
              <select
                className="border-gray-200 rounded text-sm px-3 py-1.5"
                value={bulkActionValue}
                onChange={(e) => setBulkActionValue(e.target.value)}
              >
                <option value="">Select Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {(bulkAction === 'update_gst' || bulkAction === 'update_price') && (
              <input
                type="number"
                placeholder={bulkAction === 'update_gst' ? "GST %" : "Price"}
                className="w-24 border-gray-200 rounded text-sm px-3 py-1.5"
                value={bulkActionValue}
                onChange={(e) => setBulkActionValue(e.target.value)}
              />
            )}

            <button
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={!bulkAction || (bulkAction !== 'delete' && !bulkActionValue)}
              onClick={handleBulkAction}
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Product Form Drawer/Modal Content */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 space-y-5 animate-slideDown">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings size={20} className="text-blue-500" />
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h3>
            <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Code *</label>
              <input required value={form.productCode} onChange={e => setForm({ ...form, productCode: e.target.value })} className="w-full border rounded px-3 py-2 bg-gray-50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Name *</label>
              <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded px-3 py-2">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">HSN</label>
              <input value={form.hsn} onChange={e => setForm({ ...form, hsn: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Unit *</label>
              <select required value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full border rounded px-3 py-2 bg-white">
                <option value="">Select Unit</option>
                {['Nos', 'Pcs', 'Box', 'Set', 'Mtr', 'SqFt', 'Kg', 'Ltr', 'Bag', 'Dozen'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Selling Price (₹) *</label>
              <input type="number" step="0.01" required value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: e.target.value })} className="w-full border rounded px-3 py-2 font-medium" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">GST %</label>
              <input type="number" step="0.01" value={form.gstRate} onChange={e => setForm({ ...form, gstRate: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Current Stock</label>
              <input type="number" value={form.stockQty} onChange={e => setForm({ ...form, stockQty: e.target.value })} className="w-full border rounded px-3 py-2 font-medium text-blue-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Reorder Level</label>
              <input type="number" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary px-6">
              {saving ? 'Saving...' : (editingId ? 'Update Product' : 'Save Product')}
            </button>
          </div>
        </form>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4 font-medium">Product Code</th>
                <th className="p-4 font-medium">Name & Category</th>
                <th className="p-4 font-medium">Price (₹)</th>
                <th className="p-4 font-medium">GST %</th>
                <th className="p-4 font-medium">Stock</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const outOfStock = product.stockQty <= 0;
                  const lowStock = !outOfStock && product.stockQty <= (product.reorderLevel || 5);

                  return (
                    <tr key={product._id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={selectedIds.includes(product._id)}
                          onChange={() => toggleSelect(product._id)}
                        />
                      </td>
                      <td className="p-4 font-medium text-gray-900">{product.productCode || product.code || '-'}</td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{product.category || 'General'}</span>
                          {product.hsn && <span>HSN: {product.hsn}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <input
                          defaultValue={product.sellingPrice}
                          onBlur={(e) => handleInlineEdit(product._id, 'sellingPrice', Number(e.target.value))}
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          className="w-28 px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white transition-all font-semibold"
                          type="number"
                          step="0.01"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          defaultValue={product.gstRate}
                          onBlur={(e) => handleInlineEdit(product._id, 'gstRate', Number(e.target.value))}
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          className="w-16 px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white transition-all"
                          type="number"
                          step="0.01"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <input
                            defaultValue={product.stockQty}
                            onBlur={(e) => handleInlineEdit(product._id, 'stockQty', Number(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            className={`w-16 px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white transition-all font-medium ${outOfStock ? 'text-red-600' : lowStock ? 'text-orange-600' : 'text-gray-900'}`}
                            type="number"
                          />
                          <span className="text-xs text-gray-500 lowercase">{product.unit || 'nos'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {outOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle size={12} /> Out of Stock
                          </span>
                        ) : lowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <AlertTriangle size={12} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Package size={48} className="mb-3 opacity-20" />
                      <p className="text-lg font-medium text-gray-500">No products found</p>
                      <p className="text-sm">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div >
  );
};

export default Products;
