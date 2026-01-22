import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Loader, Edit, Trash2 } from 'lucide-react';
import usePersistentState from '../hooks/usePersistentState';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = usePersistentState('products.searchTerm', '');
  const [showForm, setShowForm] = usePersistentState('products.showForm', false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = usePersistentState('products.form', {
    productCode: '',
    name: '',
    hsn: '', // Added HSN
    unit: '',
    gstRate: '',
    sellingPrice: '',
    stockQty: ''
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
        hsn: form.hsn, // Added HSN
        unit: form.unit,
        gstRate: Number(form.gstRate) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        stockQty: Number(form.stockQty) || 0,
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setForm({ productCode: '', name: '', hsn: '', unit: '', gstRate: '', sellingPrice: '', stockQty: '' });
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
      hsn: product.hsn || '', // Added HSN
      unit: product.unit || '',
      gstRate: product.gstRate || '',
      sellingPrice: product.sellingPrice || '',
      stockQty: product.stockQty || ''
    });
    setEditingId(product._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product', error);
        alert('Failed to delete product');
      }
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/products/${id}`, { status: newStatus });
      setProducts(products.map(p =>
        (p._id === id || p.id === id) ? { ...p, status: newStatus } : p
      ));
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status");
    }
  };

  const filteredProducts = products.filter((p) => {
    const name = (p?.name || '').toLowerCase();
    const code = (p?.productCode || p?.code || '').toLowerCase();
    const term = (searchTerm || '').toLowerCase();
    return name.includes(term) || code.includes(term);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Loader className="animate-spin mr-2" /> Loading Products...
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
            placeholder="Search products by name or code..."
            className="pl-10 w-full h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setForm({ productCode: '', name: '', hsn: '', unit: '', gstRate: '', sellingPrice: '', stockQty: '' });
          setShowForm(true);
        }}>
          + Add Product
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm space-y-4 border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              required
              placeholder="Product Code"
              value={form.productCode}
              onChange={e => setForm({ ...form, productCode: e.target.value })}
            />
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="HSN Code"
              value={form.hsn}
              onChange={e => setForm({ ...form, hsn: e.target.value })}
            />
            <select
              required
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
              className="bg-white border rounded px-3 py-2"
            >
              <option value="">Select Unit</option>
              {['Nos', 'Pcs', 'Box', 'Set', 'Mtr', 'SqFt', 'Kg', 'Ltr', 'Bag', 'Dozen'].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              placeholder="GST %"
              value={form.gstRate}
              onChange={e => setForm({ ...form, gstRate: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Selling Price"
              value={form.sellingPrice}
              onChange={e => setForm({ ...form, sellingPrice: e.target.value })}
            />
            <input
              type="number"
              placeholder="Stock Qty"
              value={form.stockQty}
              onChange={e => setForm({ ...form, stockQty: e.target.value })}
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : (editingId ? 'Update Product' : 'Save Product')}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Name</th>
                <th>HSN</th>
                <th>Unit</th>
                <th>Selling Price (₹)</th>
                <th>GST %</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product._id || product.id || product.productCode || product.code || product.name} className="hover:bg-gray-50 transition-colors">
                    <td className="font-medium text-gray-900">{product.productCode || product.code || '-'}</td>
                    <td>{product.name || '-'}</td>
                    <td>{product.hsn || '-'}</td>
                    <td>
                      <span className="bg-gray-100 text-gray-700 py-1 px-2 rounded text-xs font-medium uppercase">
                        {product.unit || '-'}
                      </span>
                    </td>
                    <td className="font-semibold">₹ {Number(product.sellingPrice || 0).toFixed(2)}</td>
                    <td>{product.gstRate ?? '-'}%</td>
                    <td>
                      <span className={`font-medium ${Number(product.stockQty ?? product.stock ?? 0) < 10 ? 'text-red-500' : 'text-gray-900'}`}>
                        {product.stockQty ?? product.stock ?? 0}
                      </span>
                    </td>
                    <td>
                      <select
                        value={product.status || (product.stockQty > 0 ? "In Stock" : "Out of Stock")}
                        onChange={(e) => handleStatusUpdate(product._id || product.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-none outline-none cursor-pointer appearance-none ${(product.status === "In Stock" || (!product.status && product.stockQty > 0))
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}
                      >
                        <option value="In Stock">In Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No products found matching "{searchTerm}"
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
