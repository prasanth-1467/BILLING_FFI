import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Loader, Phone, MapPin, Hash, Edit, Trash2 } from 'lucide-react';
import usePersistentState from '../hooks/usePersistentState';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = usePersistentState('customers.searchTerm', '');
  const [showForm, setShowForm] = usePersistentState('customers.showForm', false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = usePersistentState('customers.form', {
    name: '',
    phone: '',
    gstNumber: '',
    state: '',
    address: ''
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
    if (form.phone.length !== 10) {
      alert('Phone number must be exactly 10 digits');
      return;
    }
    if (form.gstNumber !== 'URP' && form.gstNumber.length !== 15) {
      alert('GST Number must be exactly 15 characters');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        gstNumber: form.gstNumber,
        state: form.state,
        address: form.address
      };

      if (editingId) {
        await api.put(`/customers/${editingId}`, payload);
      } else {
        await api.post('/customers', payload);
      }

      setForm({ name: '', phone: '', gstNumber: '', state: '', address: '' });
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
      address: customer.address || ''
    });
    setEditingId(customer._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await api.delete(`/customers/${id}`);
        fetchCustomers();
      } catch (error) {
        console.error('Failed to delete customer', error);
        alert('Failed to delete customer');
      }
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    c?.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Loader className="animate-spin mr-2" /> Loading Customers...
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
            placeholder="Search customers by name or phone..."
            className="pl-10 w-full h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setForm({ name: '', phone: '', gstNumber: '', state: '', address: '' });
          setShowForm(true);
        }}>
          + Add Customer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg shadow-sm space-y-4 border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Phone"
              value={form.phone}
              maxLength={10}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 10) setForm({ ...form, phone: val });
              }}
            />
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="GST Number"
                  value={form.gstNumber}
                  disabled={form.gstNumber === 'URP'}
                  onChange={e => setForm({ ...form, gstNumber: e.target.value })}
                  className={`border rounded px-3 py-2 flex-grow ${form.gstNumber === 'URP' ? 'bg-gray-100 text-gray-500' : ''}`}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.gstNumber === 'URP'}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setForm({ ...form, gstNumber: isChecked ? 'URP' : '' });
                  }}
                  className="w-4 h-4"
                />
                Unregistered Person (URP)
              </label>
            </div>
            <select
              required
              value={form.state}
              onChange={e => setForm({ ...form, state: e.target.value })}
              className="bg-white border rounded px-3 py-2"
            >
              <option value="">Select State</option>
              {[
                "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
                "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
                "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
                "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
                "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
                "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
              ].map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Address"
            className="w-full"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
          />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : (editingId ? 'Update Customer' : 'Save Customer')}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer, idx) => (
            <div
              key={customer._id || customer.id || customer.gstNumber || customer.phone || idx}
              className="card hover:shadow-md transition-shadow relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 text-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold">
                  {(customer?.name || '?').charAt(0)}
                </div>
                <span className="badge bg-gray-100 text-gray-600">{customer.state}</span>
              </div>

              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => handleEdit(customer)}
                  className="p-1.5 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                  title="Edit"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDelete(customer._id)}
                  className="p-1.5 text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">{customer.name}</h3>
              <div className="space-y-2 text-sm text-gray-600 mt-4">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span>{customer.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-gray-400" />
                  <span>GST: {customer.gstNumber || 'Unregistered'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span>{customer.address || customer.state}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            No customers found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;
