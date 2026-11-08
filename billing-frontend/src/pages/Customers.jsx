import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Loader, Phone, MapPin, Hash, Edit, Trash2, Users, FileText, CheckCircle, AlertCircle, Settings, FilePlus, Mail } from 'lucide-react';
import usePersistentState from '../hooks/usePersistentState';
import PageHeader from '../components/common/PageHeader';
import TableSkeleton from '../components/common/TableSkeleton';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';

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
    email: '',
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
        email: form.email ? form.email.trim() : '',
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

      setForm({ name: '', phone: '', email: '', gstNumber: '', state: '', address: '', tags: [] });
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
      email: customer.email || '',
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
      <div className="space-y-6 animate-fadeIn">
        <PageHeader
          title="Customer Directory and CRM"
          subtitle="Manage client accounts, GST information, categories, and contact details"
        />
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Customer Directory & CRM"
        subtitle="Manage client accounts, GST information, categories, and contact details"
        badge={`${totalCustomers} Customers`}
        actions={
          <button
            onClick={() => {
              setEditingId(null);
              setForm({ name: '', phone: '', gstNumber: '', state: '', address: '', tags: [] });
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#FF7A18] hover:bg-[#FF923D] rounded-xl shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-150 cursor-pointer"
          >
            <Users size={18} /> Add Customer
          </button>
        }
      />
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111726] p-5 rounded-xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-[#FF7A18]/15 flex items-center justify-center text-[#FF7A18]">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-bold text-[#F8FAFC]">{totalCustomers}</h3>
          </div>
        </div>

        <div className="bg-[#111726] p-5 rounded-xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider">B2B Registered</p>
            <h3 className="text-2xl font-bold text-[#F8FAFC]">{registeredCount}</h3>
          </div>
        </div>

        <div className="bg-[#111726] p-5 rounded-xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider">B2C (URP)</p>
            <h3 className="text-2xl font-bold text-[#F8FAFC]">{urpCount}</h3>
          </div>
        </div>
      </div>

      {/* Top Filter Controls */}
      <div className="bg-[#111726] p-4 rounded-xl shadow-sm border border-[#1F2B45] flex flex-col xl:flex-row gap-4 justify-between items-center">
        <div className="flex flex-1 flex-wrap gap-3 items-center w-full">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="pl-10 w-full h-10 border border-[#1F2B45] rounded-lg focus:ring-2 focus:ring-[#FF7A18] bg-[#172033]/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="h-10 border border-[#1F2B45] rounded-lg text-sm px-3 appearance-none bg-[#172033]/50 cursor-pointer hover:bg-[#172033] focus:ring-2 focus:ring-[#FF7A18]"
            value={gstFilter}
            onChange={(e) => setGstFilter(e.target.value)}
          >
            <option value="All">All GST Status</option>
            <option value="Registered">Registered (B2B)</option>
            <option value="URP">Unregistered (B2C)</option>
          </select>

          <select
            className="h-10 border border-[#1F2B45] rounded-lg text-sm px-3 appearance-none bg-[#172033]/50 cursor-pointer hover:bg-[#172033] focus:ring-2 focus:ring-[#FF7A18] max-w-[200px] truncate"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="All">All Locations</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="h-10 border border-[#1F2B45] rounded-lg text-sm px-3 appearance-none bg-[#172033]/50 cursor-pointer hover:bg-[#172033] focus:ring-2 focus:ring-[#FF7A18]"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="All">All Tags</option>
            {PRESET_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button className="btn btn-primary shadow-md flex items-center gap-2 flex-shrink-0" onClick={() => {
          setEditingId(null);
          setForm({ name: '', phone: '', email: '', gstNumber: '', state: '', address: '', tags: [] });
          setShowForm(true);
        }}>
          <Users size={18} />
          Add Customer
        </button>
      </div>

      {/* Slide-down Form Modal */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#111726] p-6 rounded-xl shadow-lg border border-[#FF7A18]/30 space-y-5 animate-slideDown relative">
          <div className="flex items-center justify-between border-b border-[#1F2B45] pb-3 mb-4">
            <h3 className="text-lg font-bold text-[#F8FAFC] flex items-center gap-2">
              <Settings size={20} className="text-[#FF7A18]" />
              {editingId ? 'Edit Customer Profile' : 'New Customer Profile'}
            </h3>
            <button type="button" className="text-[#64748B] hover:text-red-500 transition-colors p-1" onClick={() => setShowForm(false)}>✕</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">Business / Customer Name *</label>
                <input required placeholder="Enter full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-[#1F2B45] rounded-lg px-4 py-2.5 bg-[#172033] focus:bg-[#111726]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  placeholder="10 or 11 digit number"
                  value={form.phone}
                  maxLength={11}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 11) setForm({ ...form, phone: val });
                  }}
                  className="w-full border border-[#1F2B45] rounded-lg px-4 py-2.5 bg-[#172033] focus:bg-[#111726]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={form.email || ''}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-[#1F2B45] rounded-lg px-4 py-2.5 bg-[#172033] focus:bg-[#111726]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">GST Number</label>
                  <label className="flex items-center gap-2 text-xs font-medium text-[#FF7A18] bg-[#FF7A18]/15 px-2 py-0.5 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.gstNumber === 'URP'}
                      onChange={(e) => setForm({ ...form, gstNumber: e.target.checked ? 'URP' : '' })}
                      className="rounded text-[#FF7A18] focus:ring-[#FF7A18]"
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
                  className={`w-full border rounded-lg px-4 py-2.5 ${form.gstNumber === 'URP' ? 'bg-[#172033] border-[#1F2B45] text-[#64748B]' : 'bg-[#172033] border-[#1F2B45] focus:bg-[#111726]'}`}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">State *</label>
                <select required value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="w-full border border-[#1F2B45] rounded-lg px-4 py-2.5 bg-[#172033] focus:bg-[#111726]">
                  <option value="">Select Primary State</option>
                  {STATES.map(state => <option key={state} value={state}>{state}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">Full Address</label>
                <textarea
                  placeholder="Street address, City, Pincode"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-[#1F2B45] rounded-lg px-4 py-2.5 bg-[#172033] focus:bg-[#111726] min-h-[50px] resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-1.5">Customer Tags</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map(tag => {
                    const isActive = form.tags?.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isActive ? 'bg-[#FF7A18]/15 border-[#FF7A18]/30 text-[#FF7A18]' : 'bg-[#172033] border-[#1F2B45] text-[#94A3B8] hover:text-[#F8FAFC]'}`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-5 border-t border-[#1F2B45] mt-6">
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary px-8 shadow-sm">
              {saving ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Customer')}
            </button>
          </div>
        </form>
      )}

      {/* Main Table View */}
      <div className="bg-[#111726] rounded-xl shadow-sm border border-[#1F2B45] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#172033]/80 border-b border-[#1F2B45] text-xs uppercase tracking-wider text-[#94A3B8]">
                <th className="p-4 font-semibold">Customer Details</th>
                <th className="p-4 font-semibold">Contact Info</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">GST Status</th>
                <th className="p-4 font-semibold text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2B45]">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => {
                  const isURP = !customer.gstNumber || customer.gstNumber === 'URP';
                  return (
                    <tr key={customer._id} className="table-record-row hover:bg-[#FFF0E5] dark:hover:bg-[#172033]/60 transition-colors group cursor-pointer">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#FF7A18]/15 flex items-center justify-center text-[#FF7A18] font-bold border border-[#FF7A18]/30 shadow-sm flex-shrink-0">
                            {(customer?.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#F8FAFC]">{customer.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {customer.tags && customer.tags.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[#172033] text-[#94A3B8] font-medium border border-[#1F2B45]">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-[#F8FAFC] hover:text-[#FF7A18] font-medium group/link">
                          <div className="p-1.5 bg-[#172033] rounded group-hover/link:bg-[#FF7A18]/15 transition-colors">
                            <Phone size={14} className="text-[#64748B] group-hover/link:text-[#FF7A18]" />
                          </div>
                          {customer.phone || 'N/A'}
                        </a>
                        {customer.email && (
                          <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-xs text-[#94A3B8] hover:text-[#38BDF8] mt-1 group/email">
                            <div className="p-1.5 bg-[#172033] rounded group-hover/email:bg-[#38BDF8]/15 transition-colors">
                              <Mail size={12} className="text-[#64748B] group-hover/email:text-[#38BDF8]" />
                            </div>
                            <span className="truncate max-w-[150px]">{customer.email}</span>
                          </a>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-2 max-w-xs">
                          <MapPin size={16} className="text-[#64748B] mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-[#F8FAFC]">{customer.state}</p>
                            <p className="text-xs text-[#94A3B8] line-clamp-2" title={customer.address}>{customer.address}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isURP ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#172033] text-[#94A3B8] border border-[#1F2B45]">
                              Unregistered (URP)
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#22C55E]">
                                <CheckCircle size={12} className="text-[#22C55E]" /> Registered
                              </span>
                              <span className="text-xs text-[#94A3B8] font-mono tracking-wide">{customer.gstNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyIdForInvoice(customer)}
                            className="p-1.5 text-[#22C55E] hover:bg-[#22C55E]/15 border border-transparent hover:border-[#22C55E]/30 rounded-md transition-all flex items-center gap-1 text-xs font-medium"
                            title="Start Invoice"
                          >
                            <FilePlus size={16} /> <span className="hidden xl:inline">Invoice</span>
                          </button>

                          <div className="w-px h-6 bg-[#1F2B45] mx-1"></div>

                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1.5 text-[#FF7A18] hover:bg-[#FF7A18]/15 rounded-md transition-colors"
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
    <td colSpan="5" className="py-6">
      <EmptyState
        icon={Users}
        title="No customers found"
        description={searchTerm ? "No customers match your search criteria." : "Create your first customer to begin issuing quotations and invoices."}
        actionText="Add Customer"
        onAction={() => {
          setEditingId(null);
          setForm({ name: '', phone: '', gstNumber: '', state: '', address: '', tags: [] });
          setShowForm(true);
        }}
      />
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
