import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { Loader, FileText, CheckCircle, Clock, Eye, Download, Trash2, Edit, Save, X, MoreVertical, FilePlus, Send, RefreshCcw, Copy, Printer, MessageCircle, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import TableSkeleton from '../components/common/TableSkeleton';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import { useToast } from '../context/ToastContext';

const Quotations = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState(null);
  const [printingId, setPrintingId] = useState(null);
  const [includeSignature, setIncludeSignature] = useState(false);
  const [includeSeal, setIncludeSeal] = useState(false);
  const [includeShippingAddress, setIncludeShippingAddress] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('indigo');
  const [pdfDocType, setPdfDocType] = useState('quotation'); // 'quotation' | 'proforma'

  const [editingId, setEditingId] = useState(null);
  const [editingDateId, setEditingDateId] = useState(null);
  const [editDate, setEditDate] = useState("");
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
    fetchDefaultTheme();
  }, []);

  const fetchDefaultTheme = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data && response.data.defaultTheme) {
        setSelectedTheme(response.data.defaultTheme);
      }
    } catch (error) {
      console.error('Failed to fetch default theme', error);
    }
  };

  const handleConvert = async (quoteId) => {
    setConvertingId(quoteId);
    try {
      await api.post(`/invoices/from-quotation/${quoteId}`, {
        paymentType: 'Cash',
        paidAmount: 0 // Default to Unpaid on convert
      });
      showToast({
        title: 'Converted to Tax Invoice',
        description: 'Quotation successfully converted to an active Tax Invoice.',
        type: 'invoice'
      });
      navigate('/invoices');
    } catch (e) {
      console.error('Convert failed', e);
      showToast({
        title: 'Conversion Failed',
        description: e.response?.data?.error || 'Failed to convert quotation.',
        type: 'alert'
      });
    } finally {
      setConvertingId(null);
    }
  };

  const handleDownload = async (id, quoteNumber) => {
    try {
      const response = await api.get(`/quotations/${id}/pdf`, {
        params: { includeSignature, includeSeal, includeShippingAddress, theme: selectedTheme, docType: pdfDocType },
        responseType: 'blob',
      });
      const prefix = pdfDocType === 'proforma' ? 'Proforma' : 'Quotation';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${prefix}-${quoteNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download PDF', error);
      alert('Failed to download PDF');
    }
  };

  const handlePrint = async (id) => {
    try {
      setPrintingId(id);
      const response = await api.get(`/quotations/${id}/pdf`, {
        params: { includeSignature, includeSeal, includeShippingAddress, theme: selectedTheme, docType: pdfDocType },
        responseType: 'blob',
      });

      // Check if response is JSON (error)
      if (response.headers['content-type']?.includes('application/json')) {
        const text = await response.data.text();
        const json = JSON.parse(text);
        alert(json.error || "Failed to generate PDF");
        setPrintingId(null);
        return;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }

          // Cleanup
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            setPrintingId(null);
          }, 1000);
        }, 200);
      };
    } catch (error) {
      console.error('Failed to print PDF', error);
      alert('Failed to prepare print dialog');
      setPrintingId(null);
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

  const handleShareWhatsApp = (quote, toAdmin = false) => {
    const adminPhone = import.meta.env.VITE_ADMIN_PHONE;
    const customerPhone = quote.customerId?.phone;
    const targetPhone = toAdmin ? adminPhone : customerPhone;

    if (!targetPhone) {
      alert(toAdmin ? 'Admin phone number is not configured in .env file.' : 'Customer does not have a phone number saved.');
      return;
    }

    const docName = pdfDocType === 'proforma' ? 'Proforma Invoice' : 'Quotation';
    const text = `Hello ${toAdmin ? 'Admin' : quote.customerName},\n\n${toAdmin ? '*Admin Copy* of ' : ''}${docName} *${quote.quoteNumber}* for *₹${Number(quote.total).toLocaleString('en-IN')}* has been generated.\n\nThank you!`;
    const wsUrl = `https://wa.me/${targetPhone.startsWith('91') ? targetPhone : '91' + targetPhone}?text=${encodeURIComponent(text)}`;
    window.open(wsUrl, '_blank');
  };

  const handleEmailToMe = async (quote) => {
    try {
      setSaving(true);
      await api.post(`/quotations/${quote.id}/email-to-me?includeSignature=${includeSignature}&includeSeal=${includeSeal}&includeShippingAddress=${includeShippingAddress}&theme=${selectedTheme}&docType=${pdfDocType}`);
      alert('Email sent successfully to your admin email!');
    } catch (error) {
      console.error('Email failed', error);
      alert(error.response?.data?.error || 'Failed to send email. Check .env configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await api.post(`/quotations/${id}/duplicate`);
      alert(`Quotation duplicated as ${res.data.quoteNumber}`);
      fetchQuotes();
    } catch (error) {
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
  const startEditingDate = (quote) => {
    setEditingDateId(quote.id);
    setEditDate(quote.date ? format(new Date(quote.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  };

  const cancelEditingDate = () => {
    setEditingDateId(null);
    setEditDate("");
  };

  const saveQuoteDate = async () => {
    if (!editDate) return alert("Date cannot be empty");
    setSaving(true);
    try {
      await api.patch(`/quotations/${editingDateId}`, { date: editDate });
      setQuotes(quotes.map(q =>
        (q._id === editingDateId || q.id === editingDateId) ? { ...q, date: editDate } : q
      ));
      cancelEditingDate();
    } catch (error) {
      alert(error.response?.data?.error || "Failed to update date");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <PageHeader
          title="Quotations and Proposals"
          subtitle="Prepare proposals, track customer approvals, and convert to invoices"
        />
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  const normalized = quotes.map((q) => ({
    ...q,
    id: q._id || q.id,
    customerName: q.customerId?.name || q.customerName,
    total: q.total ?? q.totalAmount,
    date: q.date
  })).sort((a, b) => {
    return (a.quoteNumber || '').localeCompare(b.quoteNumber || '', undefined, { numeric: true, sensitivity: 'base' });
  });

  // Metrics
  const totalQuotes = normalized.length;
  const convertedCount = normalized.filter(q => q.status === 'Converted').length;
  const conversionRate = totalQuotes > 0 ? Math.round((convertedCount / totalQuotes) * 100) : 0;
  const pendingCount = normalized.filter(q => q.status === 'Draft' || q.status === 'Sent').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Converted': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#22C55E]/30 bg-[#22C55E]/15 text-[#22C55E]">Converted</span>;
      case 'Approved': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#38BDF8]/30 bg-[#38BDF8]/15 text-[#38BDF8]">Approved</span>;
      case 'Sent': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#6366F1]/30 bg-[#6366F1]/15 text-[#818CF8]">Sent</span>;
      case 'Rejected': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]">Rejected</span>;
      default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#1F2B45] bg-[#172033] text-[#94A3B8]">Draft</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Quotations & Proposals"
        subtitle="Prepare proposals, track customer approvals, and convert seamlessly to GST tax invoices"
        badge={`${totalQuotes} Total`}
        actions={
          <button
            onClick={() => navigate('/quotation')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#FF7A18] hover:bg-[#FF923D] active:bg-[#FF7A18] rounded-xl shadow-md shadow-[#FF7A18]/25 hover:shadow-[#FF7A18]/35 transition-all duration-150 cursor-pointer"
          >
            <FilePlus size={18} /> Create Quotation
          </button>
        }
      />
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111726] p-5 rounded-xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-[#FF7A18]/15 flex items-center justify-center text-[#FF7A18]">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider">Total Quotations</p>
            <h3 className="text-2xl font-bold text-[#F8FAFC]">{totalQuotes}</h3>
          </div>
        </div>

        <div className="bg-[#111726] p-5 rounded-xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-[#22C55E]/15 flex items-center justify-center text-[#22C55E]">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider">Converted</p>
            <h3 className="text-2xl font-bold text-[#F8FAFC]">{conversionRate}% ({convertedCount})</h3>
          </div>
        </div>

        <div className="bg-[#111726] p-5 rounded-xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-full bg-[#FF7A18]/15 flex items-center justify-center text-[#FF7A18]">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider">Pending (Drafts)</p>
            <h3 className="text-2xl font-bold text-[#F8FAFC]">{pendingCount}</h3>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#111726] p-4 rounded-xl shadow-sm border border-[#1F2B45] mt-2 gap-4">
        <div className="flex flex-1 flex-wrap gap-3 items-center w-full">
          {/* Document Type Toggle Switch */}
          <div className="flex items-center bg-[#172033] p-1 rounded-xl border border-[#1F2B45]">
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider pl-2 pr-1 select-none">PDF Type:</span>
            <button
              type="button"
              onClick={() => setPdfDocType('quotation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${pdfDocType === 'quotation'
                ? 'bg-[#FF7A18] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111726]'
                }`}
            >
              Quotation
            </button>
            <button
              type="button"
              onClick={() => setPdfDocType('proforma')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${pdfDocType === 'proforma'
                ? 'bg-[#FF7A18] text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111726]'
                }`}
            >
              Proforma Invoice
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] bg-[#172033] px-3 py-2.5 rounded-lg cursor-pointer border hover:bg-[#172033]">
            <input
              type="checkbox"
              className="w-4 h-4 text-[#FF7A18] rounded focus:ring-[#FF7A18] border-[#1F2B45]"
              checked={includeShippingAddress}
              onChange={e => setIncludeShippingAddress(e.target.checked)}
            />
            Include Shipping Address
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] bg-[#172033] px-3 py-2.5 rounded-lg cursor-pointer border hover:bg-[#172033]">
            <input
              type="checkbox"
              className="w-4 h-4 text-[#FF7A18] rounded focus:ring-[#FF7A18] border-[#1F2B45]"
              checked={includeSignature}
              onChange={e => setIncludeSignature(e.target.checked)}
            />
            Include Signature on PDFs
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-[#F8FAFC] bg-[#172033] px-3 py-2.5 rounded-lg cursor-pointer border hover:bg-[#172033]">
            <input
              type="checkbox"
              className="w-4 h-4 text-[#FF7A18] rounded focus:ring-[#FF7A18] border-[#1F2B45]"
              checked={includeSeal}
              onChange={e => setIncludeSeal(e.target.checked)}
            />
            Include Seal on PDFs
          </label>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="text-sm font-medium text-[#F8FAFC] bg-[#172033] px-3 py-2.5 rounded-lg border hover:bg-[#172033] outline-none cursor-pointer"
            title="Select PDF Theme"
          >
            <option value="indigo">Classic Indigo</option>
            <option value="emerald">Forest Emerald</option>
            <option value="crimson">Warm Crimson</option>
            <option value="charcoal">Sleek Charcoal</option>
            <option value="plain">Plain Black & White</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/quotation')}
            className="inline-flex items-center gap-2 text-sm font-bold text-white bg-[#FF7A18] px-4 py-2 rounded-lg hover:bg-[#FF923D] shadow-sm transition-all cursor-pointer"
            title="Create a New Quotation"
          >
            <FilePlus size={16} />
            Create Quotation
          </button>
          <button className="btn btn-outline flex items-center gap-2 flex-shrink-0" onClick={fetchQuotes}>
            <RefreshCcw size={16} /> Sync
          </button>
        </div>
      </div>

      <div className="bg-[#111726] rounded-xl shadow-sm border border-[#1F2B45] overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#172033]/80 border-b border-[#1F2B45] text-xs uppercase tracking-wider text-[#94A3B8]">
                <th className="p-4 font-semibold">Quote #</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Total Amount</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2B45]">
              {normalized.length > 0 ? (
                normalized.map((q) => (
                  <React.Fragment key={q.id}>
                    <tr className="hover:bg-[#FF7A18]/15/20 transition-colors group">
                      <td className="p-4 font-medium text-[#FF7A18]">
                        {editingId === q.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              className="border border-[#1F2B45] rounded-md px-2 py-1 w-32 text-sm focus:ring-2 focus:ring-[#FF7A18] outline-none"
                              value={editNumber}
                              onChange={e => setEditNumber(e.target.value)}
                              autoFocus
                            />
                            <button onClick={saveQuoteNumber} disabled={saving} className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100">
                              <Save size={14} />
                            </button>
                            <button onClick={cancelEditing} className="p-1 rounded bg-[#172033] text-[#94A3B8] hover:bg-[#172033]">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-[#FF7A18]" />
                            {q.quoteNumber || '-'}
                            <button
                              onClick={() => startEditing(q)}
                              className="opacity-0 group-hover:opacity-100 text-[#64748B] hover:text-[#FF7A18] transition-opacity p-1"
                              title="Edit Quote Number"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-[#F8FAFC]">
                        {editingDateId === q.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              className="border border-[#1F2B45] rounded-md px-2 py-0.5 text-xs focus:ring-2 focus:ring-[#FF7A18] outline-none"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              autoFocus
                            />
                            <button onClick={saveQuoteDate} disabled={saving} className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100">
                              <Save size={14} />
                            </button>
                            <button onClick={cancelEditingDate} className="p-1 rounded bg-[#172033] text-[#94A3B8] hover:bg-[#172033]">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group/date">
                            {q.date ? format(new Date(q.date), 'dd MMM yyyy') : 'N/A'}
                            <button
                              onClick={() => startEditingDate(q)}
                              className="opacity-0 group-hover/date:opacity-100 text-[#64748B] hover:text-[#FF7A18] transition-opacity p-1"
                              title="Edit Date"
                            >
                              <Edit size={12} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-[#F8FAFC]">{q.customerName || '-'}</p>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(q.status)}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-[#F8FAFC] bg-[#172033] px-2.5 py-1 rounded-md border border-[#1F2B45]">₹ {Number(q.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-1.5 text-[#94A3B8] hover:bg-[#172033] rounded-md transition-colors tooltip"
                            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                            title="View Items"
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            onClick={() => navigate(`/quotations/edit/${q.id}`)}
                            title="Edit Quotation Products & Details"
                          >
                            <Edit size={18} />
                          </button>

                          <button
                            className="p-1.5 text-[#FF7A18] hover:bg-[#FF7A18]/15 rounded-md transition-colors"
                            onClick={() => handleDownload(q.id, q.quoteNumber)}
                            title="Download PDF"
                          >
                            <Download size={18} />
                          </button>

                          <button
                            onClick={() => handlePrint(q.id)}
                            disabled={printingId === q.id}
                            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] rounded-md transition-colors border border-transparent"
                            title="Quick Print"
                          >
                            {printingId === q.id ? <Loader size={18} className="animate-spin" /> : <Printer size={18} />}
                          </button>

                          <button
                            onClick={() => handleConvert(q.id)}
                            disabled={q.status === 'Converted' || convertingId === q.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${q.status === 'Converted' ? 'bg-[#172033] text-[#64748B] cursor-not-allowed' : 'bg-[#22C55E]/15 text-[#22C55E] hover:bg-[#22C55E]/25 border border-[#22C55E]/30'
                              }`}
                            title={q.status === 'Converted' ? 'Already converted' : 'Convert to invoice'}
                          >
                            {convertingId === q.id ? <Loader size={16} className="animate-spin" /> : <FilePlus size={16} />}
                            <span className="hidden xl:inline">{q.status === 'Converted' ? 'Converted' : 'Convert'}</span>
                          </button>

                          <div className="relative" ref={activeDropdown === q.id ? dropdownRef : null}>
                            <button
                              className="p-1.5 text-[#94A3B8] hover:bg-[#172033] rounded-md transition-colors"
                              onClick={() => setActiveDropdown(activeDropdown === q.id ? null : q.id)}
                            >
                              <MoreVertical size={18} />
                            </button>

                            {activeDropdown === q.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-[#111726] border border-[#1F2B45] rounded-lg shadow-xl z-50 py-1 text-sm text-left">
                                <div className="px-3 py-1.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Update Status</div>
                                {['Draft', 'Sent', 'Approved', 'Rejected'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => { handleStatusChange(q.id, s); setActiveDropdown(null); }}
                                    className={`w-full text-left px-4 py-2 hover:bg-[#172033] ${q.status === s ? 'text-[#FF7A18] font-medium bg-[#FF7A18]/15/50' : 'text-[#F8FAFC]'}`}
                                  >
                                    Mark as {s}
                                  </button>
                                ))}
                                <div className="border-t border-[#1F2B45] my-1"></div>
                                <button onClick={() => { navigate(`/quotations/edit/${q.id}`); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[#FF7A18] hover:bg-[#FF7A18]/15 flex items-center gap-2 font-medium">
                                  <Edit size={14} /> Edit Quotation & Items
                                </button>
                                <button onClick={() => { handleDuplicate(q.id); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[#F8FAFC] hover:bg-[#172033] flex items-center gap-2">
                                  <Copy size={14} /> Duplicate
                                </button>
                                <button onClick={() => { handleShareWhatsApp(q, false); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-green-600 hover:bg-green-50 flex items-center gap-2">
                                  <MessageCircle size={14} /> Share to Customer
                                </button>
                                <button onClick={() => { handleShareWhatsApp(q, true); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-green-600 hover:bg-green-50 flex items-center gap-2">
                                  <MessageCircle size={14} /> Share to Me
                                </button>
                                <button onClick={() => { handleDelete(q.id); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2">
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedId === q.id && (
                      <tr className="bg-gradient-to-r from-white/[0.03] to-transparent border-b border-[#1F2B45] shadow-inner">
                        <td colSpan="6" className="p-0">
                          <div className="px-6 py-4 space-y-3">
                            <div className="flex gap-8 text-sm text-[#F8FAFC] mb-4 bg-[#111726] p-3 rounded-md border border-[#1F2B45]/60 inline-flex shadow-sm">
                              <div><span className="text-[#94A3B8] uppercase text-xs font-bold tracking-wider mr-2">Subtotal:</span> ₹{Number(q.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                              <div><span className="text-[#94A3B8] uppercase text-xs font-bold tracking-wider mr-2">Discount %:</span> {Number(q.discountPercent || 0)}%</div>
                              <div><span className="text-[#FF7A18] uppercase text-xs font-bold tracking-wider mr-2">Total Total:</span> <span className="font-bold text-[#F8FAFC]">₹{Number(q.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                            </div>

                            <div className="overflow-hidden border border-[#1F2B45] rounded-lg">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-[#172033] text-[#94A3B8]">
                                  <tr>
                                    <th className="px-4 py-2 font-medium">Item Name</th>
                                    <th className="px-4 py-2 font-medium">Quantity</th>
                                    <th className="px-4 py-2 font-medium">Rate</th>
                                    <th className="px-4 py-2 font-medium">GST %</th>
                                    <th className="px-4 py-2 font-medium">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F2B45] bg-[#111726]">
                                  {(q.items || []).map((it, idx) => (
                                    <tr key={idx} className="table-record-row hover:bg-[#FFF0E5] dark:hover:bg-[#172033] transition-colors">
                                      <td className="px-4 py-2">{it.name || it.productId?.name || it.productId || 'Unknown'}</td>
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
    <td colSpan="6" className="py-6">
      <EmptyState
        icon={FileText}
        title="No quotations found"
        description="Start by converting an enquiry or adding a new quotation."
        actionText="New Quotation"
        actionLink="/quotation"
      />
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
