import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Search,
  Loader,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  CheckSquare,
  Settings,
  Plus,
  FolderPlus,
  Tag,
  Check,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import usePersistentState from '../hooks/usePersistentState';
import IrrigationLoader from '../components/IrrigationLoader';

const DEFAULT_CATEGORIES = [
  { name: 'Drip', startCode: 1001 },
  { name: 'Automat', startCode: 501 },
  { name: 'Sprinkler', startCode: 2001 },
  { name: 'HDPE/PVC', startCode: 3001 },
  { name: 'PVC Valves', startCode: 4001 }
];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Custom Categories
  const [customCategories, setCustomCategories] = usePersistentState('products.customCategories', []);

  // Merged List of Categories
  const categoriesList = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.filter(
      (cc) => !DEFAULT_CATEGORIES.some((dc) => dc.name.toLowerCase() === cc.name.toLowerCase())
    )
  ];

  // Search & Filters
  const [searchTerm, setSearchTerm] = usePersistentState('products.searchTerm', '');
  const [categoryFilter, setCategoryFilter] = usePersistentState('products.categoryFilter', 'All');
  const [stockFilter, setStockFilter] = usePersistentState('products.stockFilter', 'All');

  // Form & Selection State
  const [showForm, setShowForm] = usePersistentState('products.showForm', false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals State
  const [showAssignCategoryModal, setShowAssignCategoryModal] = useState(false);
  const [targetCategoryForAssign, setTargetCategoryForAssign] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryStartCode, setNewCategoryStartCode] = useState('5001');

  // Product Form State
  const [form, setForm] = usePersistentState('products.form', {
    productCode: '',
    name: '',
    hsn: '',
    category: 'Drip',
    unit: 'Nos',
    gstRate: '18',
    purchasePrice: '',
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
      const sorted = (response.data || []).sort((a, b) => {
        const codeA = (a.productCode || a.code || '').toLowerCase();
        const codeB = (b.productCode || b.code || '').toLowerCase();
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setProducts(sorted);
    } catch (error) {
      console.error('Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Get Next Suggested Product Code for a Category
  const getNextSuggestedCode = (catName, currentProductList = products) => {
    const catProducts = currentProductList.filter(
      (p) => (p.category || '').toLowerCase() === catName.toLowerCase()
    );
    const foundCategory = categoriesList.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase()
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

  // Handle opening form to add a product
  const handleOpenAddForm = (initialCategory = null) => {
    const targetCat = initialCategory || (categoryFilter !== 'All' ? categoryFilter : 'Drip');
    const autoCode = getNextSuggestedCode(targetCat);

    setForm({
      productCode: autoCode,
      name: '',
      hsn: '',
      category: targetCat,
      unit: 'Nos',
      gstRate: '18',
      purchasePrice: '',
      sellingPrice: '',
      stockQty: '0',
      reorderLevel: 5
    });
    setEditingId(null);
    setShowForm(true);
  };

  // Handle Form Category Change -> Update Suggested Product Code automatically if adding
  const handleFormCategoryChange = (newCat) => {
    if (!editingId) {
      const autoCode = getNextSuggestedCode(newCat);
      setForm((prev) => ({
        ...prev,
        category: newCat,
        productCode: autoCode
      }));
    } else {
      setForm((prev) => ({ ...prev, category: newCat }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const codeTrimmed = (form.productCode || '').trim();

      // Duplicate Code Check across entire catalogue
      const isDuplicate = products.some(
        (p) =>
          p._id !== editingId &&
          (p.productCode || p.code || '').trim().toLowerCase() === codeTrimmed.toLowerCase()
      );

      if (isDuplicate) {
        alert(
          `⚠️ Duplicate Product Code Error:\nProduct Code "${codeTrimmed}" is already assigned to another product in your catalogue.\nPlease use a unique code.`
        );
        setSaving(false);
        return;
      }

      const payload = {
        productCode: codeTrimmed,
        name: form.name.trim(),
        hsn: form.hsn.trim(),
        category: form.category || 'Drip',
        unit: form.unit || 'Nos',
        gstRate: Number(form.gstRate) || 0,
        purchasePrice: Number(form.purchasePrice) || 0,
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

      setShowForm(false);
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product', error);
      alert('Failed to save product: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product) => {
    setForm({
      productCode: product.productCode || product.code || '',
      name: product.name || '',
      hsn: product.hsn || '',
      category: product.category || 'Drip',
      unit: product.unit || 'Nos',
      gstRate: product.gstRate || '',
      purchasePrice: product.purchasePrice || '',
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
        setSelectedIds(selectedIds.filter((selId) => selId !== id));
        fetchProducts();
      } catch (error) {
        console.error('Failed to delete product', error);
      }
    }
  };

  // Execute Bulk Category Assignment
  const handleApplyBulkCategory = async () => {
    if (!targetCategoryForAssign) {
      alert('Please select a category');
      return;
    }

    try {
      await api.post('/products/bulk-action', {
        action: 'update_category',
        productIds: selectedIds,
        data: { category: targetCategoryForAssign }
      });

      alert(`Successfully assigned ${selectedIds.length} products to "${targetCategoryForAssign}".`);
      setSelectedIds([]);
      setShowAssignCategoryModal(false);
      setTargetCategoryForAssign('');
      fetchProducts();
    } catch (error) {
      console.error('Bulk category update failed', error);
      alert('Failed to update category for selected products.');
    }
  };

  // Execute Bulk Delete
  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)) {
      return;
    }
    try {
      await api.post('/products/bulk-action', {
        action: 'delete',
        productIds: selectedIds
      });
      setSelectedIds([]);
      fetchProducts();
    } catch (error) {
      console.error('Bulk delete failed', error);
      alert('Bulk delete failed');
    }
  };

  // Add Custom Category
  const handleCreateCategory = (e) => {
    e.preventDefault();
    const nameTrim = newCategoryName.trim();
    if (!nameTrim) return;

    const exists = categoriesList.some((c) => c.name.toLowerCase() === nameTrim.toLowerCase());
    if (exists) {
      alert(`Category "${nameTrim}" already exists.`);
      return;
    }

    const newCategoryObj = {
      name: nameTrim,
      startCode: Number(newCategoryStartCode) || 5001
    };

    const updatedCustom = [...customCategories, newCategoryObj];
    setCustomCategories(updatedCustom);
    setNewCategoryName('');
    setNewCategoryStartCode('5001');
    setShowAddCategoryModal(false);
    setCategoryFilter(nameTrim);
  };

  const handleInlineEdit = async (id, field, value) => {
    try {
      await api.put(`/products/${id}`, { [field]: value });
      const updated = products.map((p) => (p._id === id ? { ...p, [field]: value } : p));
      if (field === 'productCode' || field === 'code') {
        updated.sort((a, b) => {
          const codeA = (a.productCode || a.code || '').toLowerCase();
          const codeB = (b.productCode || b.code || '').toLowerCase();
          return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });
      }
      setProducts(updated);
    } catch (error) {
      console.error(`Failed to update ${field}`, error);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((selId) => selId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p._id));
    }
  };

  const filteredProducts = products.filter((p) => {
    const name = (p?.name || '').toLowerCase();
    const code = (p?.productCode || p?.code || '').toLowerCase();
    const cat = (p?.category || '').toLowerCase();
    const term = (searchTerm || '').toLowerCase();

    const matchesSearch = name.includes(term) || code.includes(term) || cat.includes(term);
    const matchesCategory =
      categoryFilter === 'All' || (p.category || '').toLowerCase() === categoryFilter.toLowerCase();

    const isOutOfStock = p.stockQty <= 0;
    const isLowStock = p.stockQty > 0 && p.stockQty <= (p.reorderLevel || 5);
    const isInStock = p.stockQty > (p.reorderLevel || 5);

    let matchesStock = true;
    if (stockFilter === 'Out of Stock') matchesStock = isOutOfStock;
    else if (stockFilter === 'Low Stock') matchesStock = isLowStock;
    else if (stockFilter === 'In Stock') matchesStock = isInStock;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const outOfStockCount = products.filter((p) => p.stockQty <= 0).length;
  const lowStockCount = products.filter(
    (p) => p.stockQty > 0 && p.stockQty <= (p.reorderLevel || 5)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <IrrigationLoader message="Loading inventory catalog..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Metrics Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <Package className="text-indigo-600" size={28} />
            Product Catalogue
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Fine Flow Irrigation inventory master list & category manager
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenAddForm()}
            className="btn btn-primary shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <Plus size={18} /> Add New Product
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => {
            setStockFilter('All');
            setCategoryFilter('All');
          }}
          className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
            stockFilter === 'All' && categoryFilter === 'All'
              ? 'border-indigo-500 ring-2 ring-indigo-100'
              : 'border-slate-100'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Products</p>
            <h3 className="text-2xl font-black text-slate-900">{products.length}</h3>
            <p className="text-[11px] text-indigo-600 font-bold mt-0.5">Click to view all</p>
          </div>
        </div>

        <div
          onClick={() => setStockFilter('Low Stock')}
          className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
            stockFilter === 'Low Stock' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-100'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Low Stock Items</p>
            <h3 className="text-2xl font-black text-slate-900">{lowStockCount}</h3>
            <p className="text-[11px] text-amber-600 font-bold mt-0.5">Click to filter list</p>
          </div>
        </div>

        <div
          onClick={() => setStockFilter('Out of Stock')}
          className={`bg-white p-5 rounded-2xl shadow-sm border flex items-center gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
            stockFilter === 'Out of Stock' ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-100'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Out of Stock</p>
            <h3 className="text-2xl font-black text-slate-900">{outOfStockCount}</h3>
            <p className="text-[11px] text-rose-600 font-bold mt-0.5">Click to filter list</p>
          </div>
        </div>
      </div>

      {/* CATEGORY SWITCHER TABS RIBBON */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={14} className="text-indigo-500" /> Filter By Category
          </span>
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
          >
            <FolderPlus size={14} /> + Add Category
          </button>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 overflow-x-auto custom-scrollbar pb-1">
          {/* ALL Tab */}
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              categoryFilter === 'All'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-slate-900/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <span>All Products</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                categoryFilter === 'All' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {products.length}
            </span>
          </button>

          {/* 5 Core & Custom Category Tabs */}
          {categoriesList.map((cat) => {
            const isSelected = categoryFilter.toLowerCase() === cat.name.toLowerCase();
            const count = products.filter(
              (p) => (p.category || '').toLowerCase() === cat.name.toLowerCase()
            ).length;

            return (
              <button
                key={cat.name}
                onClick={() => setCategoryFilter(cat.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
                <span className="text-[9px] font-mono opacity-60">({cat.startCode}+)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-center w-full">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={`Search ${categoryFilter === 'All' ? 'all products' : categoryFilter} by name, code...`}
              className="pl-10 w-full h-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Stock Filter Dropdown */}
          <select
            className="h-10 border-slate-200 rounded-xl text-xs font-semibold px-3 bg-slate-50 cursor-pointer hover:bg-slate-100 text-slate-700 outline-none w-full sm:w-48"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="All">All Stock Levels</option>
            <option value="In Stock">In Stock Only</option>
            <option value="Low Stock">Low Stock Alert</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* SELECTION & BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckSquare className="text-indigo-400" size={20} />
            <span className="font-bold text-sm">{selectedIds.length} Products Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTargetCategoryForAssign(categoriesList[0]?.name || 'Drip');
                setShowAssignCategoryModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Tag size={14} /> Assign Category
            </button>

            <button
              onClick={handleBulkDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Delete Selected
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL FORM */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 space-y-5 animate-slideDown"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings size={18} className="text-indigo-600" />
              {editingId ? 'Edit Product Details' : 'Add New Catalogue Product'}
            </h3>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              onClick={() => setShowForm(false)}
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category Selection (Auto-suggests Code!) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => handleFormCategoryChange(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Product Code *
                </label>
                {!editingId && (
                  <span className="text-[10px] text-indigo-600 font-bold">Auto-Suggested</span>
                )}
              </div>
              <input
                required
                value={form.productCode}
                onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 1001"
              />
            </div>

            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 16mm Drip Lateral Pipe (Class 2)"
              />
            </div>

            {/* HSN */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                HSN Code
              </label>
              <input
                value={form.hsn}
                onChange={(e) => setForm({ ...form, hsn: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 3917"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Unit *
              </label>
              <select
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500"
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

            {/* Purchase Price */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Purchase Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                placeholder="Cost price"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="Selling price"
              />
            </div>

            {/* GST Rate */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                GST Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.gstRate}
                onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 18"
              />
            </div>

            {/* Current Stock */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                required
                value={form.stockQty}
                onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                placeholder="Quantity"
              />
            </div>

            {/* Reorder Level */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              className="btn btn-outline px-4 py-2 text-xs font-semibold rounded-xl"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary px-6 py-2 text-xs font-bold rounded-xl shadow-md"
            >
              {saving ? 'Saving...' : editingId ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      )}

      {/* MAIN PRODUCTS TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-500">
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    checked={
                      selectedIds.length === filteredProducts.length && filteredProducts.length > 0
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4">Code</th>
                <th className="p-4">Product Name & Category</th>
                <th className="p-4">HSN</th>
                <th className="p-4">Unit</th>
                <th className="p-4">GST %</th>
                <th className="p-4">Purchase (₹)</th>
                <th className="p-4">Selling (₹)</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const outOfStock = product.stockQty <= 0;
                  const lowStock = !outOfStock && product.stockQty <= (product.reorderLevel || 5);
                  const isChecked = selectedIds.includes(product._id);

                  return (
                    <tr
                      key={product._id}
                      className={`hover:bg-indigo-50/30 transition-colors group ${
                        isChecked ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleSelect(product._id)}
                        />
                      </td>

                      {/* Product Code */}
                      <td className="p-4 font-mono font-bold text-slate-900 text-xs">
                        <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-slate-800">
                          {product.productCode || product.code || '-'}
                        </span>
                      </td>

                      {/* Name & Category */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md border border-indigo-100 text-[11px]">
                            <Tag size={10} />
                            {product.category || 'Drip'}
                          </span>
                        </div>
                      </td>

                      {/* HSN */}
                      <td className="p-4 text-xs font-mono text-slate-600">
                        {product.hsn || '-'}
                      </td>

                      {/* Unit */}
                      <td className="p-4 text-xs font-medium text-slate-600">
                        {product.unit || 'Nos'}
                      </td>

                      {/* GST % */}
                      <td className="p-4">
                        <input
                          defaultValue={product.gstRate ?? 18}
                          onBlur={(e) =>
                            handleInlineEdit(product._id, 'gstRate', Number(e.target.value))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          className="w-16 px-2 py-1 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-lg bg-transparent focus:bg-white transition-all text-xs font-semibold"
                          type="number"
                          step="0.01"
                        />
                      </td>

                      {/* Purchase Price */}
                      <td className="p-4">
                        <input
                          defaultValue={product.purchasePrice ?? ''}
                          onBlur={(e) =>
                            handleInlineEdit(product._id, 'purchasePrice', Number(e.target.value))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          className="w-24 px-2 py-1 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-lg bg-transparent focus:bg-white transition-all text-xs font-medium text-slate-600"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Selling Price */}
                      <td className="p-4">
                        <input
                          defaultValue={product.sellingPrice}
                          onBlur={(e) =>
                            handleInlineEdit(product._id, 'sellingPrice', Number(e.target.value))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          className="w-24 px-2 py-1 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-lg bg-transparent focus:bg-white transition-all font-bold text-xs text-slate-900"
                          type="number"
                          step="0.01"
                        />
                      </td>

                      {/* Stock Qty */}
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <input
                            defaultValue={product.stockQty}
                            onBlur={(e) =>
                              handleInlineEdit(product._id, 'stockQty', Number(e.target.value))
                            }
                            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                            className={`w-16 px-2 py-1 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded-lg bg-transparent focus:bg-white transition-all font-bold text-xs ${
                              outOfStock
                                ? 'text-rose-600'
                                : lowStock
                                ? 'text-amber-600'
                                : 'text-slate-900'
                            }`}
                            type="number"
                          />
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        {outOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle size={12} /> Out of Stock
                          </span>
                        ) : lowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle size={12} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package size={48} className="mb-3 opacity-20" />
                      <p className="text-base font-bold text-slate-600">
                        {categoryFilter === 'All'
                          ? 'No products found matching your search'
                          : `No products in "${categoryFilter}" category yet.`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">
                        Add a product under {categoryFilter} or adjust your filters.
                      </p>
                      <button
                        onClick={() => handleOpenAddForm(categoryFilter !== 'All' ? categoryFilter : 'Drip')}
                        className="btn btn-primary px-4 py-2 text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                      >
                        <Plus size={16} /> Add Product to {categoryFilter === 'All' ? 'Drip' : categoryFilter}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: BULK ASSIGN CATEGORY MODAL */}
      {showAssignCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-slate-100 animate-slideDown">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="text-indigo-600" size={18} />
                Assign Category
              </h3>
              <button
                onClick={() => setShowAssignCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-medium text-slate-500">
              Select a category to assign to the <strong className="text-indigo-600 font-bold">{selectedIds.length} selected products</strong>:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {categoriesList.map((cat) => (
                <label
                  key={cat.name}
                  onClick={() => setTargetCategoryForAssign(cat.name)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    targetCategoryForAssign === cat.name
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-100'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="assignCategory"
                      checked={targetCategoryForAssign === cat.name}
                      onChange={() => setTargetCategoryForAssign(cat.name)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Code {cat.startCode}+</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                className="btn btn-outline px-4 py-2 text-xs font-semibold rounded-xl"
                onClick={() => setShowAssignCategoryModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkCategory}
                className="btn btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-md"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <form
            onSubmit={handleCreateCategory}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-slate-100 animate-slideDown"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="text-indigo-600" size={18} />
                Add New Category
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Category Name *
              </label>
              <input
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Filters"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Starting Product Code *
              </label>
              <input
                type="number"
                required
                value={newCategoryStartCode}
                onChange={(e) => setNewCategoryStartCode(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 5001"
              />
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                className="btn btn-outline px-4 py-2 text-xs font-semibold rounded-xl"
                onClick={() => setShowAddCategoryModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-md"
              >
                Create Category
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Products;
