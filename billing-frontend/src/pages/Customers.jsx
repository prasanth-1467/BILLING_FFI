import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Loader, Phone, MapPin, Hash, Edit, Trash2, Users, FileText, CheckCircle, AlertCircle, Settings, FilePlus } from 'lucide-react';
import usePersistentState from '../hooks/usePersistentState';

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const PRESET_TAGS = ["Farmer", "Dealer", "Contractor", "Institution", "Other"];

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = usePersistentState('customers.searchTerm', '');
  const [stateFilter, setStateFilter] = usePersistentState('customers.stateFilter', 'All');
  const [tagFilter, setTagFilter] = usePersistentState('customers.tagFilter', 'All');
  const [gstFilter, setGstFilter] = usePersistentState('customers.gstFilter', 'All'); // All, Registered, URP

  // Form handling
  const [showForm, setShowForm] = usePersistentState('customers.showForm', false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = usePersistentState('customers.form', {
    name: '',
    phone: '',
    gstNumber: '',
    state: '',
    address: '',
    tags: []
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.phone && (form.phone.length < 10 || form.phone.length > 11)) {
      alert('Phone number must be 10 or 11 digits');
      return;
    }
    if (form.gstNumber && form.gstNumber !== 'URP' && form.gstNumber.length !== 15) {
      alert('GST Number must be exactly 15 characters');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        gstNumber: form.gstNumber || 'URP',
        state: form.state,
        address: form.address,
        tags: form.tags || []
      };

      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
      } else {
        await api.post('/customers', payload);
      }

      setForm({ name: '', phone: '', gstNumber: '', state: '', address: '', tags: [] });
      setShowForm(false);
      setEditingId(null);
      fetchCustomers();
    } catch (error) {
      console.error('Failed to save customer', error);
      alert('Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (customer) => {
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      gstNumber: customer.gstNumber || '',
      state: customer.state || '',
      address: customer.address || '',
      tags: customer.tags || []
    });
    setEditingId(customer._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      try {
        await api.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (error) {
        console.error('Failed to delete customer', error);
        alert('Failed to delete customer');
      }
    }
  };

  const handleTagToggle = (tag) => {
    const currentTags = form.tags || [];
    if (currentTags.includes(tag)) {
      setForm({ ...form, tags: currentTags.filter(t => t !== tag) });
    } else {
      setForm({ ...form, tags: [...currentTags, tag] });
    }
  };

  const copyIdForInvoice = (customer) => {
    navigator.clipboard.writeText(customer._id);
    alert(`Copied ID for ${customer.name}. You can use this ID in the Invoice creation process.`);
  };

  // Filter Logic
  const filteredCustomers = customers.filter(c => {
    const name = (c?.name || '').toLowerCase();
    const phone = c?.phone || '';
    const term = (searchTerm || '').toLowerCase();

    const matchesSearch = name.includes(term) || phone.includes(term);
    const matchesState = stateFilter === 'All' || c.state === stateFilter;
    const matchesTag = tagFilter === 'All' || (c.tags && c.tags.includes(tagFilter));

    const isURP = !c.gstNumber || c.gstNumber === 'URP';
    const matchesGst = gstFilter === 'All'
      || (gstFilter === 'URP' && isURP)
      || (gstFilter === 'Registered' && !isURP);

    return matchesSearch && matchesState && matchesTag && matchesGst;
  });

  // Calculate stats
  const totalCustomers = customers.length;
  const registeredCount = customers.filter(c => c.gstNumber && c.gstNumber !== 'URP').length;
  const urpCount = totalCustomers - registeredCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Loader className="animate-spin mr-2" /> Loading CRM...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalCustomers}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">B2B Registered</p>
            <h3 className="text-2xl font-bold text-gray-900">{registeredCount}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">B2C (URP)</p>
            <h3 className="text-2xl font-bold text-gray-900">{urpCount}</h3>
          </div>
        </div>
      </div>

      {/* Top Filter Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="flex flex-1 flex-wrap gap-3 items-center w-full">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="pl-10 w-full h-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="h-10 border border-gray-200 rounded-lg text-sm px-3 appearance-none bg-gray-50/50 cursor-pointer hover:bg-gray-100 focus:ring-2 focus:ring-blue-500"
            value={gstFilter}
            onChange={(e) => setGstFilter(e.target.value)}
          >
            <option value="All">All GST Status</option>
            <option value="Registered">Registered (B2B)</option>
            <option value="URP">Unregistered (B2C)</option>
          </select>

          <select
            className="h-10 border border-gray-200 rounded-lg text-sm px-3 appearance-none bg-gray-50/50 cursor-pointer hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="All">All Locations</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="h-10 border border-gray-200 rounded-lg text-sm px-3 appearance-none bg-gray-50/50 cursor-pointer hover:bg-gray-100 focus:ring-2 focus:ring-blue-500"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="All">All Tags</option>
            {PRESET_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button className="btn btn-primary shadow-md flex items-center gap-2 flex-shrink-0" onClick={() => {
          setEditingId(null);
          setForm({ name: '', phone: '', gstNumber: '', state: '', address: '', tags: [] });
          setShowForm(true);
        }}>
          <Users size={18} />
          Add Customer
        </button>
      </div>

      {/* Slide-down Form Modal */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 space-y-5 animate-slideDown relative">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings size={20} className="text-blue-500" />
              {editingId ? 'Edit Customer Profile' : 'New Customer Profile'}
            </h3>
            <button type="button" className="text-gray-400 hover:text-red-500 transition-colors p-1" onClick={() => setShowForm(false)}>✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Business / Customer Name *</label>
                <input required placeholder="Enter full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  placeholder="10 or 11 digit number"
                  value={form.phone}
                  maxLength={11}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 11) setForm({ ...form, phone: val });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">GST Number</label>
                  <label className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gstNumber === 'URP'}
                      onChange={(e) => setForm({ ...form, gstNumber: e.target.checked ? 'URP' : '' })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Unregistered (URP)
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Enter 15-character GSTIN"
                  value={form.gstNumber}
                  disabled={form.gstNumber === 'URP'}
                  onChange={e => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
                  className={`w-full border rounded-lg px-4 py-2.5 ${form.gstNumber === 'URP' ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-gray-50 border-gray-300 focus:bg-white'}`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">State *</label>
                <select required value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white">
                  <option value="">Select Primary State</option>
                  {STATES.map(state => <option key={state} value={state}>{state}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Address</label>
                <textarea
                  placeholder="Street address, City, Pincode"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-50 focus:bg-white min-h-[50px] resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Customer Tags</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map(tag => {
                    const isActive = form.tags?.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isActive ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-5 border-t border-gray-100 mt-6">
            <button type="button" className="btn bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary px-8 shadow-sm">
              {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Customer')}
            </button>
          </div>
        </form>
      )}

      {/* Main Table View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-semibold">Customer Details</th>
                <th className="p-4 font-semibold">Contact Info</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">GST Status</th>
                <th className="p-4 font-semibold text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const isURP = !customer.gstNumber || customer.gstNumber === 'URP';
                  return (
                    <tr key={customer._id} className="hover:bg-blue-50/20 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-sm flex-shrink-0">
                            {(customer?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{customer.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {customer.tags && customer.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-medium group/link">
                          <div className="p-1.5 bg-gray-50 rounded group-hover/link:bg-blue-50 transition-colors">
                            <Phone size={14} className="text-gray-400 group-hover/link:text-blue-500" />
                          </div>
                          {customer.phone || 'N/A'}
                        </a>
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-2 max-w-xs">
                          <MapPin size={16} className="text-gray-400 mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">{customer.state}</p>
                            <p className="text-xs text-gray-500 line-clamp-2" title={customer.address}>{customer.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isURP ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              Unregistered (URP)
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                <CheckCircle size={12} className="text-emerald-500" /> Registered
                              </span>
                              <span className="text-xs text-gray-500 font-mono tracking-wide">{customer.gstNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyIdForInvoice(customer)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 rounded-md transition-all flex items-center gap-1 text-xs font-medium"
                            title="Start Invoice"
                          >
                            <FilePlus size={16} /> <span className="hidden xl:inline">Invoice</span>
                          </button>

                          <div className="w-px h-6 bg-gray-200 mx-1"></div>

                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(customer._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium text-gray-500">No customers found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters, or add a new customer.</p>
                      <button
                        className="mt-6 text-blue-600 font-medium hover:underline flex items-center gap-1"
                        onClick={() => setShowForm(true)}
                      >
                        <Users size={16} /> Add New Customer
                      </button>
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

export default Customers;
