import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { Loader, FileText, CheckCircle, Clock, Eye, Download, Trash2, Edit, Save, X, MoreVertical, FilePlus, Send, RefreshCcw, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const Quotations = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState(null);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  
  const [editingId, setEditingId] = useState(null);
  const [editNumber, setEditNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const [activeDropdown, setActiveDropdown] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations');
      setQuotes(res.data || []);
    } catch (e) {
      console.error('Failed to fetch quotations', e);
      alert('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleConvert = async (quoteId) => {
    setConvertingId(quoteId);
    try {
      await api.post(`/invoices/from-quotation/${quoteId}`, {
        paymentType: 'Cash',
        paidAmount: 0 // Default to Unpaid on convert
      });
      alert('Invoice created successfully!');
      navigate('/invoices');
    } catch (e) {
      console.error('Convert failed', e);
      alert(e.response?.data?.error || 'Failed to convert quotation. Check console for details.');
    } finally {
      setConvertingId(null);
    }
  };

  const handleDownload = async (id, quoteNumber) => {
    try {
      const response = await api.get(`/quotations/${id}/pdf`, {
        params: { includeSignature },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Proforma-${quoteNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download PDF', error);
      alert('Failed to download PDF');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      try {
        await api.delete(`/quotations/${id}`);
        setQuotes(quotes.filter(q => (q._id || q.id) !== id));
      } catch (error) {
        console.error('Failed to delete quotation', error);
        alert(error.response?.data?.error || 'Failed to delete quotation');
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/quotations/${id}/status`, { status: newStatus });
      setQuotes(quotes.map(q => ((q._id || q.id) === id ? { ...q, status: newStatus } : q)));
    } catch (error) {
       alert("Failed to change status");
    }
  };

  const handleDuplicate = async (id) => {
     try {
       const res = await api.post(`/quotations/${id}/duplicate`);
       alert(`Quotation duplicated as ${res.data.quoteNumber}`);
       fetchQuotes();
     } catch(error) {
       alert("Failed to duplicate quotation");
     }
  };

  const startEditing = (quote) => {
    setEditingId(quote.id);
    setEditNumber(quote.quoteNumber);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditNumber("");
  };

  const saveQuoteNumber = async () => {
    if (!editNumber.trim()) return alert("Quotation number cannot be empty");
    setSaving(true);
    try {
      await api.patch(`/quotations/${editingId}`, { quoteNumber: editNumber });
      setQuotes(quotes.map(q =>
        (q._id === editingId || q.id === editingId)
          ? { ...q, quoteNumber: editNumber }
          : q
      ));
      cancelEditing();
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Failed to update quotation number";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Loader className="animate-spin mr-2" /> Loading Quotations Workflow...
      </div>
    );
  }

  const normalized = quotes.map((q) => ({
    ...q,
    id: q._id || q.id,
    customerName: q.customerId?.name || q.customerName,
    total: q.total ?? q.totalAmount,
    date: q.date
  }));

  // Metrics
  const totalQuotes = normalized.length;
  const convertedCount = normalized.filter(q => q.status === 'Converted').length;
  const conversionRate = totalQuotes > 0 ? Math.round((convertedCount / totalQuotes) * 100) : 0;
  const pendingCount = normalized.filter(q => q.status === 'Draft' || q.status === 'Sent').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Converted': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-200 bg-green-50 text-green-700">Converted</span>;
      case 'Approved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700">Approved</span>;
      case 'Sent': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-purple-200 bg-purple-50 text-purple-700">Sent</span>;
      case 'Rejected': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-red-200 bg-red-50 text-red-700">Rejected</span>;
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-gray-200 bg-gray-50 text-gray-700">Draft</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Quotations</p>
            <h3 className="text-2xl font-bold text-gray-900">{totalQuotes}</h3>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Converted</p>
            <h3 className="text-2xl font-bold text-gray-900">{conversionRate}% ({convertedCount})</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending (Drafts)</p>
            <h3 className="text-2xl font-bold text-gray-900">{pendingCount}</h3>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-2">
        <div className="flex flex-1 flex-wrap gap-3 items-center w-full">
           <label className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg cursor-pointer border hover:bg-gray-100">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              checked={includeSignature}
              onChange={e => setIncludeSignature(e.target.checked)}
            />
            Include Signature on PDFs
          </label>
        </div>
        
        <button className="btn btn-outline flex items-center gap-2 flex-shrink-0" onClick={fetchQuotes}>
          <RefreshCcw size={16} /> Sync
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="p-4 font-semibold">Quote #</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Total Amount</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {normalized.length > 0 ? (
                normalized.map((q) => (
                  <React.Fragment key={q.id}>
                    <tr className="hover:bg-blue-50/20 transition-colors group">
                      <td className="p-4 font-medium text-blue-600">
                        {editingId === q.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="border border-gray-300 rounded-md px-2 py-1 w-32 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              value={editNumber}
                              onChange={e => setEditNumber(e.target.value)}
                              autoFocus
                            />
                            <button onClick={saveQuoteNumber} disabled={saving} className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100">
                              <Save size={14} />
                            </button>
                            <button onClick={cancelEditing} className="p-1 rounded bg-gray-50 text-gray-500 hover:bg-gray-100">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-400" />
                            {q.quoteNumber || '-'}
                            <button
                              onClick={() => startEditing(q)}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1"
                              title="Edit Quote Number"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-gray-700">{q.date ? format(new Date(q.date), 'dd MMM yyyy') : 'N/A'}</td>
                      <td className="p-4">
                        <p className="font-bold text-gray-900">{q.customerName || '-'}</p>
                      </td>
                      <td className="p-4">
                         {getStatusBadge(q.status)}
                      </td>
                      <td className="p-4">
                         <span className="font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">₹ {Number(q.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors tooltip"
                            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                            title="View Items"
                          >
                            <Eye size={18} />
                          </button>
                          
                          <button
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            onClick={() => handleDownload(q.id, q.quoteNumber)}
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>

                          <button
                            onClick={() => handleConvert(q.id)}
                            disabled={q.status === 'Converted' || convertingId === q.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                               q.status === 'Converted' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={q.status === 'Converted' ? 'Already converted' : 'Convert to invoice'}
                          >
                            {convertingId === q.id ? <Loader size={16} className="animate-spin" /> : <FilePlus size={16} />}
                            <span className="hidden xl:inline">{q.status === 'Converted' ? 'Converted' : 'Convert'}</span>
                          </button>

                          <div className="relative" ref={activeDropdown === q.id ? dropdownRef : null}>
                            <button 
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                              onClick={() => setActiveDropdown(activeDropdown === q.id ? null : q.id)}
                            >
                               <MoreVertical size={18} />
                            </button>

                            {activeDropdown === q.id && (
                               <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-50 py-1 text-sm text-left">
                                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Update Status</div>
                                  {['Draft', 'Sent', 'Approved', 'Rejected'].map(s => (
                                     <button 
                                        key={s} 
                                        onClick={() => { handleStatusChange(q.id, s); setActiveDropdown(null); }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${q.status === s ? 'text-blue-600 font-medium bg-blue-50/50' : 'text-gray-700'}`}
                                     >
                                       Mark as {s}
                                     </button>
                                  ))}
                                  <div className="border-t border-gray-100 my-1"></div>
                                  <button onClick={() => { handleDuplicate(q.id); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                     <Copy size={14}/> Duplicate
                                  </button>
                                  <button onClick={() => { handleDelete(q.id); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2">
                                     <Trash2 size={14}/> Delete
                                  </button>
                               </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedId === q.id && (
                       <tr className="bg-gradient-to-r from-blue-50/30 to-transparent border-b border-gray-100 shadow-inner">
                        <td colSpan="6" className="p-0">
                          <div className="px-6 py-4 space-y-3">
                            <div className="flex gap-8 text-sm text-gray-700 mb-4 bg-white p-3 rounded-md border border-gray-200/60 inline-flex shadow-sm">
                              <div><span className="text-gray-500 uppercase text-xs font-bold tracking-wider mr-2">Subtotal:</span> ₹{Number(q.subtotal || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
                              <div><span className="text-gray-500 uppercase text-xs font-bold tracking-wider mr-2">Discount %:</span> {Number(q.discountPercent || 0)}%</div>
                              <div><span className="text-blue-600 uppercase text-xs font-bold tracking-wider mr-2">Total Total:</span> <span className="font-bold text-gray-900">₹{Number(q.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                            </div>
                            
                            <div className="overflow-hidden border border-gray-200 rounded-lg">
                               <table className="w-full text-sm text-left">
                                  <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                      <th className="px-4 py-2 font-medium">Item Name</th>
                                      <th className="px-4 py-2 font-medium">Quantity</th>
                                      <th className="px-4 py-2 font-medium">Rate</th>
                                      <th className="px-4 py-2 font-medium">GST %</th>
                                      <th className="px-4 py-2 font-medium">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 bg-white">
                                    {(q.items || []).map((it, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">{it.productId?.name || it.productId || 'Unknown'}</td>
                                        <td className="px-4 py-2">{it.qty ?? '-'}</td>
                                        <td className="px-4 py-2">₹{Number(it.rate || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-2">{Number(it.gstRate || 0)}%</td>
                                        <td className="px-4 py-2 font-medium">₹{Number(it.amount || 0).toLocaleString('en-IN')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                               </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                     <div className="flex flex-col items-center text-gray-400">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium text-gray-500">No quotations found</p>
                        <p className="text-sm mt-1">Start by converting an enquiry or adding a new quotation.</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Quotations;
