import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Loader, FileText, RefreshCcw, FileCheck, Eye, Download, Trash2, Edit, Save, X } from 'lucide-react';
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
        paidAmount: 0
      });
      alert('Invoice added');
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
  }

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
      console.error("Failed to update quotation number", error);
      const msg = error.response?.data?.error || error.message || "Failed to update quotation number";
      const status = error.response?.status;
      alert(`${msg} ${status ? `(Status: ${status})` : ''}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <Loader className="animate-spin mr-2" /> Loading Quotations...
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <FileText size={18} /> Saved Quotations
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded cursor-pointer border hover:bg-gray-100">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
              checked={includeSignature}
              onChange={e => setIncludeSignature(e.target.checked)}
            />
            Include Signature
          </label>
          <button className="btn btn-outline flex items-center gap-2" onClick={fetchQuotes}>
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {normalized.length > 0 ? (
                normalized.map((q) => (
                  <React.Fragment key={q.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="font-medium text-blue-600">
                        {editingId === q.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="border rounded px-2 py-1 w-32 text-sm"
                              value={editNumber}
                              onChange={e => setEditNumber(e.target.value)}
                              autoFocus
                            />
                            <button onClick={saveQuoteNumber} disabled={saving} className="text-green-600 hover:text-green-800">
                              <Save size={16} />
                            </button>
                            <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
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
                      <td>{q.date ? format(new Date(q.date), 'dd MMM yyyy') : 'N/A'}</td>
                      <td className="font-medium">{q.customerName || '-'}</td>
                      <td>
                        <span className={`badge ${q.status === 'Converted' ? 'badge-success' : 'badge-warning'}`}>
                          {q.status || 'Draft'}
                        </span>
                      </td>
                      <td className="font-bold text-gray-900">₹ {Number(q.total || 0).toFixed(2)}</td>
                      <td className="flex gap-2">
                        <button
                          className="btn btn-outline text-sm py-1 px-3"
                          onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                        >
                          <Eye size={16} /> View
                        </button>
                        <button
                          className="btn btn-outline text-sm py-1 px-3"
                          onClick={() => handleConvert(q.id)}
                          disabled={q.status === 'Converted' || convertingId === q.id}
                          title={q.status === 'Converted' ? 'Already converted' : 'Convert to invoice'}
                        >
                          {convertingId === q.id ? (
                            <Loader size={16} className="animate-spin" />
                          ) : (
                            <>
                              <FileCheck size={16} /> Convert
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-outline text-sm py-1 px-3"
                          onClick={() => handleDownload(q.id, q.quoteNumber)}
                          title="Download Proforma"
                        >
                          <Download size={16} /> PDF
                        </button>
                        <button
                          className="btn btn-outline text-red-600 hover:bg-red-50 text-sm py-1 px-3"
                          onClick={() => handleDelete(q.id)}
                          disabled={false} // Always allow delete
                          title="Delete Quotation"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </td>
                    </tr>
                    {expandedId === q.id && (
                      <tr>
                        <td colSpan="6" className="bg-gray-50">
                          <div className="p-4 space-y-2 text-sm text-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div><strong>Subtotal:</strong> ₹ {Number(q.subtotal || 0).toFixed(2)}</div>
                              <div><strong>Discount %:</strong> {Number(q.discountPercent || 0)}</div>
                              <div><strong>Total:</strong> ₹ {Number(q.total || 0).toFixed(2)}</div>
                            </div>
                            <div>
                              <strong>Items:</strong>
                              <div className="mt-2 overflow-auto">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Product</th>
                                      <th>Qty</th>
                                      <th>Rate</th>
                                      <th>GST %</th>
                                      <th>Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(q.items || []).map((it, idx) => (
                                      <tr key={it.productId || idx}>
                                        <td>{String(it.productId || '-')}</td>
                                        <td>{it.qty ?? '-'}</td>
                                        <td>₹ {Number(it.rate || 0).toFixed(2)}</td>
                                        <td>{Number(it.gstRate || 0)}</td>
                                        <td>₹ {Number(it.amount || 0).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No quotations found.
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

