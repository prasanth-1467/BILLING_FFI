import React, { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import TableSkeleton from '../components/common/TableSkeleton';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
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
      <div className="space-y-6 animate-fadeIn">
        <PageHeader
          title="Product Catalogue and Inventory"
          subtitle="Master catalog of irrigation fittings, pipes, accessories, and stock balances"
        />
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Metrics Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Package className="text-[#FF7A18]" size={28} />
            Product Catalogue
          </h1>
          <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
            Fine Flow Irrigation inventory master list & category manager
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenAddForm()}
            className="btn btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#FF7A18]/20 hover:shadow-[#FF7A18]/30 transition-all cursor-pointer"
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
          className={`bg-[#111726] p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 cursor-pointer flex items-center gap-4 ${
            stockFilter === 'All' && categoryFilter === 'All'
              ? 'border-[#FF7A18] ring-2 ring-[#FF7A18]/30 shadow-md'
              : 'border-[#1F2B45]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#172033] border border-[#1F2B45] flex items-center justify-center text-[#FF7A18]">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Total Products</p>
            <h3 className="text-2xl font-black text-[#F8FAFC]">{products.length}</h3>
            <p className="text-[11px] text-[#FF7A18] font-bold mt-0.5">Click to view all</p>
          </div>
        </div>

        <div
          onClick={() => setStockFilter('Low Stock')}
          className={`bg-[#111726] p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 cursor-pointer flex items-center gap-4 ${
            stockFilter === 'Low Stock' ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30 shadow-md' : 'border-[#1F2B45]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Low Stock Items</p>
            <h3 className="text-2xl font-black text-[#F8FAFC]">{lowStockCount}</h3>
            <p className="text-[11px] text-[#F59E0B] font-bold mt-0.5">Click to filter list</p>
          </div>
        </div>

        <div
          onClick={() => setStockFilter('Out of Stock')}
          className={`bg-[#111726] p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 cursor-pointer flex items-center gap-4 ${
            stockFilter === 'Out of Stock' ? 'border-[#EF4444] ring-2 ring-[#EF4444]/30 shadow-md' : 'border-[#1F2B45]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444]">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Out of Stock</p>
            <h3 className="text-2xl font-black text-[#F8FAFC]">{outOfStockCount}</h3>
            <p className="text-[11px] text-[#EF4444] font-bold mt-0.5">Click to filter list</p>
          </div>
        </div>
      </div>

      {/* CATEGORY SWITCHER TABS RIBBON */}
      <div className="bg-[#111726] p-4 rounded-2xl border border-[#1F2B45] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
            <Layers size={14} className="text-[#FF7A18]" /> Filter By Category
          </span>
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="text-xs font-bold text-[#FF7A18] hover:text-[#FF923D] hover:bg-[#172033] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <FolderPlus size={14} /> + Add Category
          </button>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1 overflow-x-auto custom-scrollbar pb-1">
          {/* ALL Tab */}
          <button
            onClick={() => setCategoryFilter('All')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              categoryFilter === 'All'
                ? 'bg-[#FF7A18] text-white shadow-md shadow-[#FF7A18]/20 ring-2 ring-[#FF7A18]/30 font-extrabold'
                : 'bg-[#0B0F19] text-[#94A3B8] border border-[#1F2B45] hover:bg-[#172033] hover:text-[#F8FAFC]'
            }`}
          >
            <span>All Products</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                categoryFilter === 'All' ? 'bg-black/20 text-white' : 'bg-[#172033] text-[#94A3B8]'
              }`}
            >
              {products.length}
            </span>
          </button>

          {/* Core & Custom Category Tabs */}
          {categoriesList.map((cat) => {
            const isSelected = categoryFilter.toLowerCase() === cat.name.toLowerCase();
            const count = products.filter(
              (p) => (p.category || '').toLowerCase() === cat.name.toLowerCase()
            ).length;

            return (
              <button
                key={cat.name}
                onClick={() => setCategoryFilter(cat.name)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF7A18] text-white shadow-md shadow-[#FF7A18]/25 ring-2 ring-[#FF7A18]/30 font-extrabold'
                    : 'bg-[#0B0F19] text-[#94A3B8] border border-[#1F2B45] hover:bg-[#172033] hover:text-[#F8FAFC]'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-[#172033] text-[#94A3B8]'
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
      <div className="bg-[#111726] p-4 rounded-2xl border border-[#1F2B45] flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-center w-full">
          {/* Search Box */}
          <div className="relative flex-1 min-w-0 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input
              type="text"
              placeholder={`Search ${categoryFilter === 'All' ? 'all products' : categoryFilter} by name, code...`}
              className="pl-10 w-full h-10 bg-[#0B0F19] border border-[#1F2B45] rounded-xl focus:border-[#FF7A18] focus:ring-1 focus:ring-[#FF7A18] text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Stock Filter Dropdown */}
          <div className="w-full sm:w-52 shrink-0">
            <select
              className="h-10 border border-[#1F2B45] rounded-xl text-xs font-semibold px-3 bg-[#0B0F19] cursor-pointer hover:bg-[#172033] text-[#F8FAFC] outline-none w-full focus:border-[#FF7A18]"
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
      </div>

      {/* SELECTION & BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-[#172033] border border-[#FF7A18]/40 text-[#F8FAFC] p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckSquare className="text-[#FF7A18]" size={20} />
            <span className="font-bold text-sm text-[#F8FAFC]">{selectedIds.length} Products Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTargetCategoryForAssign(categoriesList[0]?.name || 'Drip');
                setShowAssignCategoryModal(true);
              }}
              className="bg-[#FF7A18] hover:bg-[#FF923D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Tag size={14} /> Assign Category
            </button>

            <button
              onClick={handleBulkDelete}
              className="bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} /> Delete Selected
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="bg-[#111726] hover:bg-[#1F2B45] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#1F2B45] px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
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
          className="bg-[#111726] p-6 rounded-2xl shadow-2xl border border-[#1F2B45] space-y-5 animate-slideDown"
        >
          <div className="flex items-center justify-between border-b border-[#1F2B45] pb-3">
            <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
              <Settings size={18} className="text-[#FF7A18]" />
              {editingId ? 'Edit Product Details' : 'Add New Catalogue Product'}
            </h3>
            <button
              type="button"
              className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-bold cursor-pointer"
              onClick={() => setShowForm(false)}
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category Selection */}
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => handleFormCategoryChange(e.target.value)}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-semibold bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
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
                <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                  Product Code *
                </label>
                {!editingId && (
                  <span className="text-[10px] text-[#FF7A18] font-bold">Auto-Suggested</span>
                )}
              </div>
              <input
                required
                value={form.productCode}
                onChange={(e) => setForm({ ...form, productCode: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-mono font-bold bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                placeholder="e.g. 1001"
              />
            </div>

            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-semibold bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                placeholder="e.g. 16mm Drip Lateral Pipe (Class 2)"
              />
            </div>

            {/* HSN */}
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                HSN Code
              </label>
              <input
                value={form.hsn}
                onChange={(e) => setForm({ ...form, hsn: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-mono bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                placeholder="e.g. 3917"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Unit *
              </label>
              <select
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-medium bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none cursor-pointer"
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
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Purchase Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-medium bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                placeholder="Cost price"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-bold bg-[#0B0F19] text-[#FF7A18] focus:border-[#FF7A18] outline-none"
                placeholder="Selling price"
              />
            </div>

            {/* GST Rate */}
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                GST Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.gstRate}
                onChange={(e) => setForm({ ...form, gstRate: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-medium bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                placeholder="e.g. 18"
              />
            </div>

            {/* Current Stock */}
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Current Stock *
              </label>
              <input
                type="number"
                required
                value={form.stockQty}
                onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-bold bg-[#0B0F19] text-[#FF7A18] focus:border-[#FF7A18] outline-none"
                placeholder="Quantity"
              />
            </div>

            {/* Reorder Level */}
            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-medium bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[#1F2B45]">
            <button
              type="button"
              className="btn btn-outline px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary px-6 py-2 text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              {saving ? 'Saving...' : editingId ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      )}

      {/* MAIN PRODUCTS TABLE */}
      <div className="bg-[#111726] rounded-2xl border border-[#1F2B45] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B0F19] border-b border-[#1F2B45] text-[11px] uppercase tracking-wider font-extrabold text-[#94A3B8]">
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    className="rounded accent-[#FF7A18] w-4 h-4 cursor-pointer"
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
            <tbody className="divide-y divide-[#1F2B45]">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const outOfStock = product.stockQty <= 0;
                  const lowStock = !outOfStock && product.stockQty <= (product.reorderLevel || 5);
                  const isChecked = selectedIds.includes(product._id);

                  return (
                    <tr
                      key={product._id}
                      className={`table-record-row hover:bg-[#FFF0E5] dark:hover:bg-[#172033]/60 transition-colors group cursor-pointer ${
                        isChecked ? 'bg-[#FF7A18]/10' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          className="rounded accent-[#FF7A18] w-4 h-4 cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleSelect(product._id)}
                        />
                      </td>

                      {/* Product Code */}
                      <td className="p-4 font-mono font-bold text-xs">
                        <span className="bg-[#0B0F19] px-2 py-1 rounded-md border border-[#1F2B45] text-[#F8FAFC]">
                          {product.productCode || product.code || '-'}
                        </span>
                      </td>

                      {/* Name & Category */}
                      <td className="p-4">
                        <div className="font-bold text-[#F8FAFC] text-sm">{product.name}</div>
                        <div className="text-xs text-[#94A3B8] flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 bg-[#FF7A18]/10 text-[#FF7A18] font-semibold px-2 py-0.5 rounded-md border border-[#FF7A18]/30 text-[11px]">
                            <Tag size={10} />
                            {product.category || 'Drip'}
                          </span>
                        </div>
                      </td>

                      {/* HSN */}
                      <td className="p-4 text-xs font-mono text-[#94A3B8]">
                        {product.hsn || '-'}
                      </td>

                      {/* Unit */}
                      <td className="p-4 text-xs font-medium text-[#94A3B8]">
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
                          className="w-16 px-2 py-1 border border-transparent hover:border-[#1F2B45] focus:border-[#FF7A18] rounded-lg bg-transparent focus:bg-[#0B0F19] text-[#F8FAFC] transition-all text-xs font-semibold outline-none"
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
                          className="w-24 px-2 py-1 border border-transparent hover:border-[#1F2B45] focus:border-[#FF7A18] rounded-lg bg-transparent focus:bg-[#0B0F19] text-[#94A3B8] transition-all text-xs font-medium outline-none"
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
                          className="w-24 px-2 py-1 border border-transparent hover:border-[#1F2B45] focus:border-[#FF7A18] rounded-lg bg-transparent focus:bg-[#0B0F19] text-[#F8FAFC] font-bold text-xs transition-all outline-none"
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
                            className={`w-16 px-2 py-1 border border-transparent hover:border-[#1F2B45] focus:border-[#FF7A18] rounded-lg bg-transparent focus:bg-[#0B0F19] transition-all font-bold text-xs outline-none ${
                              outOfStock
                                ? 'text-[#EF4444]'
                                : lowStock
                                ? 'text-[#F59E0B]'
                                : 'text-[#22C55E]'
                            }`}
                            type="number"
                          />
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-4">
                        {outOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30">
                            <AlertCircle size={12} /> Out of Stock
                          </span>
                        ) : lowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                            <AlertTriangle size={12} /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span> In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-1.5 text-[#FF7A18] hover:bg-[#FF7A18]/10 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-1.5 text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors cursor-pointer"
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
                    <div className="flex flex-col items-center justify-center text-[#94A3B8]">
                      <Package size={48} className="mb-3 opacity-20 text-[#FF7A18]" />
                      <p className="text-base font-bold text-[#F8FAFC]">
                        {categoryFilter === 'All'
                          ? 'No products found matching your search'
                          : `No products in "${categoryFilter}" category yet.`}
                      </p>
                      <p className="text-xs text-[#94A3B8] mt-1 mb-4">
                        Add a product under {categoryFilter} or adjust your filters.
                      </p>
                      <button
                        onClick={() => handleOpenAddForm(categoryFilter !== 'All' ? categoryFilter : 'Drip')}
                        className="btn btn-primary px-4 py-2 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111726] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 border border-[#1F2B45] animate-slideDown">
            <div className="flex justify-between items-center border-b border-[#1F2B45] pb-3">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <Tag className="text-[#FF7A18]" size={18} />
                Assign Category
              </h3>
              <button
                onClick={() => setShowAssignCategoryModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-medium text-[#94A3B8]">
              Select a category to assign to the <strong className="text-[#FF7A18] font-bold">{selectedIds.length} selected products</strong>:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {categoriesList.map((cat) => (
                <label
                  key={cat.name}
                  onClick={() => setTargetCategoryForAssign(cat.name)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    targetCategoryForAssign === cat.name
                      ? 'border-[#FF7A18] bg-[#FF7A18]/10 ring-2 ring-[#FF7A18]/30'
                      : 'border-[#1F2B45] bg-[#0B0F19] hover:bg-[#172033]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="assignCategory"
                      checked={targetCategoryForAssign === cat.name}
                      onChange={() => setTargetCategoryForAssign(cat.name)}
                      className="accent-[#FF7A18]"
                    />
                    <span className="text-xs font-bold text-[#F8FAFC]">{cat.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#94A3B8]">Code {cat.startCode}+</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-[#1F2B45]">
              <button
                type="button"
                className="btn btn-outline px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                onClick={() => setShowAssignCategoryModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkCategory}
                className="btn btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleCreateCategory}
            className="bg-[#111726] rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-[#1F2B45] animate-slideDown"
          >
            <div className="flex justify-between items-center border-b border-[#1F2B45] pb-3">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <FolderPlus className="text-[#FF7A18]" size={18} />
                Add New Category
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="text-[#94A3B8] hover:text-[#F8FAFC] text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Category Name *
              </label>
              <input
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-semibold bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                placeholder="e.g. Filters"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
                Starting Product Code *
              </label>
              <input
                type="number"
                required
                value={newCategoryStartCode}
                onChange={(e) => setNewCategoryStartCode(e.target.value)}
                className="w-full border border-[#1F2B45] rounded-xl px-3 py-2 text-sm font-mono font-bold bg-[#0B0F19] text-[#F8FAFC] focus:border-[#FF7A18] outline-none"
                placeholder="e.g. 5001"
              />
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-[#1F2B45]">
              <button
                type="button"
                className="btn btn-outline px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                onClick={() => setShowAddCategoryModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary px-5 py-2 text-xs font-bold rounded-xl shadow-md cursor-pointer"
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
