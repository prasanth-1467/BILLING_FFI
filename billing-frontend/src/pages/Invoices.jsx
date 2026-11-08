import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, Loader, Download, FileText, CheckCircle, Clock, Eye, Trash2, Edit, Save, X, MoreVertical, IndianRupee, MessageCircle, AlertTriangle, Printer, Mail, Plus, Truck, Lock, Send, User } from 'lucide-react';
import { downloadEWayBillJSON } from '../utils/ewayBillFormatter';
import { format, isPast, startOfDay } from 'date-fns';
import PageHeader from '../components/common/PageHeader';
import TableSkeleton from '../components/common/TableSkeleton';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import { useToast } from '../context/ToastContext';

const Invoices = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const [printingId, setPrintingId] = useState(null);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [includeSeal, setIncludeSeal] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState('indigo');
    const [copyType, setCopyType] = useState('none');

    // Email Dispatch States
    const [sendingEmailId, setSendingEmailId] = useState(null);
    const [customerEmailModal, setCustomerEmailModal] = useState({
        isOpen: false,
        invoice: null,
        email: '',
        saveToCustomer: true,
        error: ''
    });

    const [editingId, setEditingId] = useState(null);
    const [editingDateId, setEditingDateId] = useState(null);
    const [editDate, setEditDate] = useState("");
    const [editNumber, setEditNumber] = useState("");
    const [saving, setSaving] = useState(false);
    const [editingEwayBillId, setEditingEwayBillId] = useState(null);
    const [editEwayBillNo, setEditEwayBillNo] = useState("");

    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    // Admin Security Lock Modal State
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [targetInvoiceId, setTargetInvoiceId] = useState(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [securityError, setSecurityError] = useState('');
    const [verifyingPassword, setVerifyingPassword] = useState(false);

    const handleInitiateEdit = (invoiceId) => {
        setTargetInvoiceId(invoiceId);
        setAdminPassword('');
        setSecurityError('');
        setShowSecurityModal(true);
    };

    const handleVerifyAndProceed = async (e) => {
        e.preventDefault();
        if (!adminPassword) {
            setSecurityError("Please enter your admin password.");
            return;
        }
        setVerifyingPassword(true);
        setSecurityError('');
        try {
            await api.post('/auth/verify-password', { password: adminPassword });
            setShowSecurityModal(false);
            navigate(`/invoices/edit/${targetInvoiceId}`);
        } catch (err) {
            console.error("Security verification failed", err);
            setSecurityError(err.response?.data?.error || "Incorrect password. Access denied.");
        } finally {
            setVerifyingPassword(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
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

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await api.get('/invoices');
            setInvoices(response.data);
        } catch (error) {
            console.error('Failed to fetch invoices', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id, invoiceNumber) => {
        try {
            setDownloadingId(id);
            const response = await api.get(`/invoices/${id}/pdf`, {
                params: { includeSignature, includeSeal, theme: selectedTheme, copyType },
                responseType: 'blob',
            });

            if (response.headers['content-type']?.includes('application/json') || response.data.type === 'application/json') {
                const text = await response.data.text();
                try {
                    const json = JSON.parse(text);
                    alert(json.error || "Failed to generate PDF");
                } catch {
                    alert("Failed to generate PDF: Server returned error");
                }
                return;
            }

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download PDF', error);
            alert('Failed to download PDF');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            try {
                await api.delete(`/invoices/${id}`);
                setInvoices(invoices.filter(invoice => (invoice._id || invoice.id) !== id));
            } catch (error) {
                console.error('Failed to delete invoice', error);
                alert('Failed to delete invoice');
            }
        }
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        setProcessingPayment(true);
        try {
            const res = await api.patch(`/invoices/${paymentInvoice.id}/payment`, { amount: Number(paymentAmount) });
            setInvoices(invoices.map(inv => (inv._id === paymentInvoice.id || inv.id === paymentInvoice.id) ? res.data : inv));
            setShowPaymentModal(false);
            setPaymentInvoice(null);
            setPaymentAmount('');
        } catch (error) {
            alert(error.response?.data?.error || "Failed to record payment");
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleShareWhatsApp = (invoice, toAdmin = false) => {
        const adminPhone = import.meta.env.VITE_ADMIN_PHONE;
        const customerPhone = invoice.customerId?.phone || invoice.customerPhone;
        const targetPhone = toAdmin ? adminPhone : customerPhone;
        if (!targetPhone) {
            showToast({
                title: 'Phone Number Missing',
                description: toAdmin ? 'Admin phone number is not configured in environment variables.' : 'This customer does not have a contact phone number saved.',
                type: 'warning'
            });
            return;
        }
        const custName = invoice.customerName || invoice.customerId?.name || 'Customer';
        const invoiceTotal = Number(invoice.total || 0).toLocaleString('en-IN');
        const balanceTotal = Number(invoice.balance || 0).toLocaleString('en-IN');
        const dueDateFormatted = invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'Immediate';

        const text = `Hello ${toAdmin ? 'Admin' : custName},\n\n${toAdmin ? '*Admin Copy* of ' : ''}Tax Invoice *#${invoice.invoiceNumber}* for *₹${invoiceTotal}* has been generated.\nPending Balance: *₹${balanceTotal}*.\nDue Date: ${dueDateFormatted}.\n\nThank you!`;
        const cleanDigits = String(targetPhone).replace(/\D/g, '');
        const normalizedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
        const wsUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
        window.open(wsUrl, '_blank');
    };

    const handleOpenEmailCustomerModal = (invoice) => {
        const initialEmail = invoice.customerId?.email || invoice.customerEmail || '';
        setCustomerEmailModal({
            isOpen: true,
            invoice,
            email: initialEmail,
            saveToCustomer: Boolean(invoice.customerId?._id),
            error: ''
        });
    };

    const handleSendCustomerEmail = async (e) => {
        e?.preventDefault();
        const { invoice, email, saveToCustomer } = customerEmailModal;
        if (!invoice) return;

        const cleanEmail = email.trim();
        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setCustomerEmailModal(prev => ({ ...prev, error: 'Please enter a valid email address.' }));
            return;
        }

        const invId = invoice.id || invoice._id;
        setSendingEmailId(invId);

        try {
            const res = await api.post(`/invoices/${invId}/email-customer?includeSignature=${includeSignature}&includeSeal=${includeSeal}&theme=${selectedTheme}&copyType=${copyType}`, {
                email: cleanEmail,
                saveToCustomer
            });

            showToast({
                title: 'Invoice Emailed Successfully',
                description: res.data?.message || `Tax Invoice #${invoice.invoiceNumber} PDF sent to ${cleanEmail}.`,
                type: 'success'
            });

            // Update local state so customer email is saved and shown in table immediately
            setInvoices(prev => prev.map(inv => {
                if (inv.id === invId || inv._id === invId) {
                    return {
                        ...inv,
                        customerEmail: cleanEmail,
                        customerId: inv.customerId ? { ...inv.customerId, email: cleanEmail } : inv.customerId
                    };
                }
                return inv;
            }));

            setCustomerEmailModal({ isOpen: false, invoice: null, email: '', saveToCustomer: true, error: '' });
        } catch (err) {
            console.error('Customer email failed:', err);
            const errMsg = err.response?.data?.error || 'Failed to dispatch email via Resend.';
            setCustomerEmailModal(prev => ({ ...prev, error: errMsg }));
            showToast({
                title: 'Email Delivery Failed',
                description: errMsg,
                type: 'alert'
            });
        } finally {
            setSendingEmailId(null);
        }
    };

    const handleEmailToMe = async (invoice) => {
        const invId = invoice.id || invoice._id;
        if (sendingEmailId === invId) return;

        setSendingEmailId(invId);
        try {
            const res = await api.post(`/invoices/${invId}/email-to-me?includeSignature=${includeSignature}&includeSeal=${includeSeal}&theme=${selectedTheme}&copyType=${copyType}`);
            showToast({
                title: 'Business Copy Emailed',
                description: res.data?.message || `Invoice #${invoice.invoiceNumber} PDF copy sent to your business email.`,
                type: 'success'
            });
        } catch (error) {
            console.error('Email to myself failed:', error);
            showToast({
                title: 'Email Delivery Failed',
                description: error.response?.data?.error || 'Failed to dispatch email copy via Resend.',
                type: 'alert'
            });
        } finally {
            setSendingEmailId(null);
        }
    };

    const startEditing = (invoice) => {
        setEditingId(invoice.id);
        setEditNumber(invoice.invoiceNumber);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditNumber("");
    };

    const saveInvoiceNumber = async () => {
        if (!editNumber.trim()) return alert("Invoice number cannot be empty");
        setSaving(true);
        try {
            await api.patch(`/invoices/${editingId}`, { invoiceNumber: editNumber });
            setInvoices(invoices.map(inv =>
                (inv._id === editingId || inv.id === editingId) ? { ...inv, invoiceNumber: editNumber } : inv
            ));
            cancelEditing();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update invoice number");
        } finally {
            setSaving(false);
        }
    };
    const startEditingDate = (invoice) => {
        setEditingDateId(invoice.id);
        setEditDate(invoice.date ? format(new Date(invoice.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    };

    const cancelEditingDate = () => {
        setEditingDateId(null);
        setEditDate("");
    };

    const saveInvoiceDate = async () => {
        if (!editDate) return alert("Date cannot be empty");
        setSaving(true);
        try {
            await api.patch(`/invoices/${editingDateId}`, { date: editDate });
            setInvoices(invoices.map(inv =>
                (inv._id === editingDateId || inv.id === editingDateId) ? { ...inv, date: editDate } : inv
            ));
            cancelEditingDate();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update date");
        } finally {
            setSaving(false);
        }
    };

    const startEditingEwayBill = (invoice) => {
        setEditingEwayBillId(invoice.id);
        setEditEwayBillNo(invoice.ewayBillNo || "");
    };

    const cancelEditingEwayBill = () => {
        setEditingEwayBillId(null);
        setEditEwayBillNo("");
    };

    const saveEwayBillNo = async () => {
        setSaving(true);
        try {
            await api.patch(`/invoices/${editingEwayBillId}`, { ewayBillNo: editEwayBillNo });
            setInvoices(invoices.map(inv =>
                (inv._id === editingEwayBillId || inv.id === editingEwayBillId) ? { ...inv, ewayBillNo: editEwayBillNo } : inv
            ));
            cancelEditingEwayBill();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update E-Way Bill number");
        } finally {
            setSaving(false);
        }
    };

    const isEWayBillRequired = (invoice) => {
        let stateSupply = "-";
        const gst = invoice.customerId?.gstNumber || invoice.customerGSTIN || "";
        if (gst.length >= 2 && !isNaN(gst.substring(0, 2))) {
            stateSupply = gst.substring(0, 2);
        } else {
            const rawState = (invoice.customerId?.state || invoice.customerState || "").toLowerCase().replace(/\s+/g, "");
            if (rawState === "tamilnadu" || rawState === "tn") {
                stateSupply = "33";
            } else {
                stateSupply = invoice.customerId?.state || invoice.customerState || "-";
            }
        }
        const isIntraState = stateSupply === "33" || stateSupply === "Tamil Nadu";
        const totalVal = invoice.totalAmount || invoice.total || 0;
        return isIntraState ? totalVal >= 100000 : totalVal >= 50000;
    };

    const handleDownloadEWayBill = (invoice) => {
        const vehicleNo = window.prompt("Enter Vehicle Registration Number (e.g., TN38AB1234):");
        if (!vehicleNo) return;

        const toPincodeInput = window.prompt("Enter Delivery Pincode (6-digit number):");
        if (!toPincodeInput) return;
        const toPincode = parseInt(toPincodeInput, 10);
        if (isNaN(toPincode) || String(toPincode).length !== 6) {
            alert("Invalid pincode. Must be a 6-digit number.");
            return;
        }

        const toPlace = window.prompt("Enter Delivery Place / City (e.g., Coimbatore):", invoice.customerId?.city || "Coimbatore");
        if (toPlace === null) return;

        const formattedInvoiceData = {
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.date,
            customerGSTIN: invoice.customerId?.gstNumber || invoice.customerGSTIN || "URP",
            customerName: invoice.customerId?.name || invoice.customerName || "Customer",
            customerAddress: invoice.customerId?.address || invoice.customerAddress || "Address",
            customerState: invoice.customerId?.state || invoice.customerState || "Tamil Nadu",
            discountPercent: invoice.discountPercent || 0,
            vehicleNo: vehicleNo.trim().toUpperCase(),
            toPincode: toPincode,
            toPlace: toPlace.trim() || invoice.customerId?.state || "Coimbatore",
            items: (invoice.items || []).map(item => ({
                name: item.name || item.productId?.name || "Product",
                hsn: item.hsn || item.productId?.hsn || "8424",
                qty: item.qty,
                rate: item.rate,
                gstRate: item.gstRate,
                unit: item.unit || item.productId?.unit || "NOS"
            }))
        };

        try {
            downloadEWayBillJSON(formattedInvoiceData);
        } catch (error) {
            alert("E-Way Bill download failed: " + error.message);
        }
    };

    const handleExportToExcel = () => {
        if (filteredInvoices.length === 0) {
            alert("No invoices to export!");
            return;
        }

        // 1. Headers matching user request & screenshot with tax rate slabs
        const headers = [
            "Invoice Date",
            "Invoice Number",
            "Customer Billing Name",
            "Customer Billing GSTIN",
            "State Place of Supply",
            "Taxable Amount",
            "CGST 2.5%",
            "SGST 2.5%",
            "CGST 9%",
            "SGST 9%",
            "IGST 5%",
            "IGST 18%",
            "Other CGST",
            "Other SGST",
            "Other IGST",
            "Total Amount"
        ];

        // 2. Map row data
        const rows = filteredInvoices.map(inv => {
            const formattedDate = inv.date ? format(new Date(inv.date), 'dd-MM-yyyy') : '';

            // Extract state code from GSTIN or state mapping
            let stateSupply = "-";
            const gst = inv.customerId?.gstNumber || "";
            if (gst.length >= 2 && !isNaN(gst.substring(0, 2))) {
                stateSupply = gst.substring(0, 2);
            } else {
                const rawState = (inv.customerId?.state || "").toLowerCase().replace(/\s+/g, "");
                if (rawState === "tamilnadu" || rawState === "tn") {
                    stateSupply = "33";
                } else {
                    stateSupply = inv.customerId?.state || "-";
                }
            }

            // Determine if Tamil Nadu (Intra-state)
            const isIntraState = stateSupply === "33";

            // Initialize tax rates variables
            let cgst2_5 = 0;
            let sgst2_5 = 0;
            let cgst9 = 0;
            let sgst9 = 0;
            let igst5 = 0;
            let igst18 = 0;
            let otherCgst = 0;
            let otherSgst = 0;
            let otherIgst = 0;

            const items = inv.items || [];
            const discountPercent = inv.discountPercent || 0;

            items.forEach(item => {
                const qty = item.qty || 0;
                const rate = item.rate || 0;
                const itemAmount = qty * rate;
                const itemTaxable = itemAmount - (itemAmount * discountPercent / 100);
                const gstRate = item.gstRate || 0;
                const taxAmount = (itemTaxable * gstRate) / 100;

                if (isIntraState) {
                    const halfTax = taxAmount / 2;
                    if (gstRate === 5) {
                        cgst2_5 += halfTax;
                        sgst2_5 += halfTax;
                    } else if (gstRate === 18) {
                        cgst9 += halfTax;
                        sgst9 += halfTax;
                    } else {
                        otherCgst += halfTax;
                        otherSgst += halfTax;
                    }
                } else {
                    if (gstRate === 5) {
                        igst5 += taxAmount;
                    } else if (gstRate === 18) {
                        igst18 += taxAmount;
                    } else {
                        otherIgst += taxAmount;
                    }
                }
            });

            const customerGSTIN = gst || "URD";
            const taxable = inv.taxableAmount || 0;
            const total = inv.totalAmount || 0;

            return [
                formattedDate,
                inv.invoiceNumber,
                inv.customerName || "-",
                customerGSTIN,
                stateSupply,
                taxable.toFixed(2),
                cgst2_5 > 0 ? cgst2_5.toFixed(2) : "0.00",
                sgst2_5 > 0 ? sgst2_5.toFixed(2) : "0.00",
                cgst9 > 0 ? cgst9.toFixed(2) : "0.00",
                sgst9 > 0 ? sgst9.toFixed(2) : "0.00",
                igst5 > 0 ? igst5.toFixed(2) : "0.00",
                igst18 > 0 ? igst18.toFixed(2) : "0.00",
                otherCgst > 0 ? otherCgst.toFixed(2) : "0.00",
                otherSgst > 0 ? otherSgst.toFixed(2) : "0.00",
                otherIgst > 0 ? otherIgst.toFixed(2) : "0.00",
                total.toFixed(2)
            ];
        });

        // 3. Generate CSV content
        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        // 4. Generate TSV content (for clipboard copy)
        const tsvContent = [
            headers.join("\t"),
            ...rows.map(row => row.join("\t"))
        ].join("\n");

        // 5. Open dynamic preview tab
        const previewWindow = window.open("", "_blank");
        if (!previewWindow) {
            alert("Pop-up blocked! Please allow pop-ups for this site to open the export assistant.");
            return;
        }

        // Build HTML for a gorgeous preview and copy tool
        const tableHeadersHTML = headers.map(h => `<th style="padding: 12px 16px; font-weight: 600; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: 13px; text-transform: uppercase; color: #4a5568; letter-spacing: 0.5px;">${h}</th>`).join("");
        const tableRowsHTML = rows.map(row => {
            const cells = row.map((val, idx) => {
                let cellStyle = "padding: 12px 16px; border-bottom: 1px solid #edf2f7; font-size: 14px; color: #2d3748;";
                // Color formatting for numbers
                if (idx >= 5) {
                    cellStyle += " font-family: monospace; font-weight: 500; text-align: right;";
                }
                if (idx === 1) {
                    cellStyle += " font-weight: 600; color: #3182ce;";
                }
                return `<td style="${cellStyle}">${val}</td>`;
            }).join("");
            return `<tr style="transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f7fafc'" onmouseout="this.style.backgroundColor='transparent'">${cells}</tr>`;
        }).join("");

        previewWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Export Assistant | Fine Flow Irrigation</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f7fafc;
            margin: 0;
            padding: 40px 24px;
            color: #2d3748;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }
        h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 28px;
            font-weight: 700;
            color: #1a202c;
            margin: 0;
        }
        .subtitle {
            color: #718096;
            font-size: 14px;
            margin-top: 4px;
        }
        .button-group {
            display: flex;
            gap: 12px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            outline: none;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .btn-sheets {
            background-color: #0f9d58;
            color: white;
        }
        .btn-sheets:hover {
            background-color: #0b8043;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(15,157,88,0.2);
        }
        .btn-open {
            background-color: #4285f4;
            color: white;
        }
        .btn-open:hover {
            background-color: #357ae8;
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(66,133,244,0.2);
        }
        .btn-download {
            background-color: #edf2f7;
            color: #4a5568;
            border: 1px solid #cbd5e0;
        }
        .btn-download:hover {
            background-color: #e2e8f0;
        }
        .instructions-card {
            background: linear-gradient(135deg, #ebf8ff 0%, #e6fffa 100%);
            border: 1px solid #bee3f8;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        .instructions-title {
            font-weight: 700;
            font-size: 16px;
            color: #2b6cb0;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .instructions-list {
            margin: 0;
            padding-left: 20px;
            font-size: 14px;
            line-height: 1.6;
            color: #2d3748;
        }
        .instructions-list li {
            margin-bottom: 8px;
        }
        .card {
            background: white;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .table-wrapper {
            overflow-x: auto;
            max-height: 500px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        th {
            background-color: #f7fafc;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .success-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background-color: #2d3748;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
            display: none;
            animation: slideUp 0.3s ease-out;
            z-index: 100;
        }
        @keyframes slideUp {
            from { transform: translateY(100px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>Invoices Export Assistant</h1>
                <div class="subtitle">Fine Flow Irrigation • ${rows.length} Invoices Found</div>
            </div>
            <div class="button-group">
                <button id="copyBtn" class="btn btn-sheets">
                    📋 Copy for Google Sheets / Excel
                </button>
                <button id="openBtn" class="btn btn-open">
                    ↗️ Open Google Sheets
                </button>
                <button id="dlBtn" class="btn btn-download">
                    📥 Download CSV
                </button>
            </div>
        </div>

        <div class="instructions-card">
            <div class="instructions-title">💡 How to instantly paste into Google Sheets / Excel without downloading:</div>
            <ol class="instructions-list">
                <li>Click the green <strong>"📋 Copy for Google Sheets / Excel"</strong> button in the top right.</li>
                <li>Click the blue <strong>"↗️ Open Google Sheets"</strong> button to open a new blank sheet in a new tab.</li>
                <li>Select cell <strong>A1</strong> in Google Sheets, and press <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong> on Mac) to paste the entire table instantly!</li>
            </ol>
        </div>

        <div class="card">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 15px; color: #4a5568; background-color: #f7fafc;">
                📊 Table Preview
            </div>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>${tableHeadersHTML}</tr>
                    </thead>
                    <tbody>
                        ${tableRowsHTML}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div id="toast" class="success-toast">
        ✓ Table copied to clipboard! Ready to paste (Ctrl+V) in Google Sheets/Excel.
    </div>

    <script>
        const tsvData = ${JSON.stringify(tsvContent)};
        const csvData = ${JSON.stringify(csvContent)};

        // Copy functionality
        document.getElementById("copyBtn").addEventListener("click", () => {
            navigator.clipboard.writeText(tsvData).then(() => {
                const toast = document.getElementById("toast");
                toast.style.display = "block";
                setTimeout(() => {
                    toast.style.display = "none";
                }, 4000);
            }).catch(err => {
                alert("Failed to copy table: " + err);
            });
        });

        // Open Sheets
        document.getElementById("openBtn").addEventListener("click", () => {
            window.open("https://sheets.new", "_blank");
        });

        // Local Download Fallback
        document.getElementById("dlBtn").addEventListener("click", () => {
            const csvContentWithBOM = "\\uFEFF" + csvData;
            const base64Content = btoa(unescape(encodeURIComponent(csvContentWithBOM)));
            const dataUri = "data:text/csv;charset=utf-8;base64," + base64Content;
            
            const link = document.createElement("a");
            link.href = dataUri;
            link.download = "Invoices_Export_" + new Date().toISOString().split('T')[0] + ".csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    </script>
</body>
</html>
        `);
        previewWindow.document.close();
    };

    const handleViewPdf = (id) => {
        window.open(`${import.meta.env.VITE_API_URL}/invoices/${id}/pdf?includeSignature=${includeSignature}&includeSeal=${includeSeal}&theme=${selectedTheme}&copyType=${copyType}`, '_blank', 'noopener,noreferrer');
    };

    const handlePrint = async (id) => {
        try {
            setPrintingId(id);
            const response = await api.get(`/invoices/${id}/pdf`, {
                params: { includeSignature, includeSeal, theme: selectedTheme, copyType },
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
                // Focus and print
                setTimeout(() => {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    }

                    // Cleanup after a delay
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

    // Calculate dynamic state for each invoice based on due date
    const computeStatus = (inv) => {
        if (inv.balance <= 0) return "Paid";
        if (inv.dueDate && isPast(startOfDay(new Date(inv.dueDate))) && inv.balance > 0) return "Overdue";
        if (inv.paidAmount > 0) return "Partially Paid";
        return "Pending";
    };

    const normalized = invoices.map(inv => ({
        ...inv,
        id: inv._id || inv.id,
        customerName: inv.customerId?.name || inv.customerName,
        totalAmount: inv.total ?? inv.totalAmount,
        paidAmount: inv.paidAmount || 0,
        balance: inv.balance ?? (inv.total - (inv.paidAmount || 0)),
        date: inv.date,
        computedStatus: computeStatus(inv)
    })).sort((a, b) => {
        return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    const filteredInvoices = normalized.filter(inv =>
        (inv.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.customerName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Metrics
    const totalRevenue = normalized.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const pendingBalance = normalized.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const overdueBalance = normalized.filter(inv => inv.computedStatus === 'Overdue').reduce((sum, inv) => sum + (inv.balance || 0), 0);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Paid': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#22C55E]/30 bg-[#22C55E]/15 text-[#22C55E]">Paid</span>;
            case 'Partially Paid': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#38BDF8]/30 bg-[#38BDF8]/15 text-[#38BDF8]">Partially Paid</span>;
            case 'Overdue': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#EF4444]/30 bg-[#EF4444]/15 text-[#EF4444]">Overdue</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#FF7A18]/30 bg-[#FF7A18]/15 text-[#FF7A18]">Pending</span>;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-fadeIn">
                <PageHeader
                    title="Tax Invoices and Billing"
                    subtitle="Manage GST compliance, incoming payments, and printable invoices"
                />
                <TableSkeleton rows={6} cols={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            <PageHeader
                title="Tax Invoices & Billing"
                subtitle="Manage GST invoices, record incoming payments, and download compliance PDFs"
                badge={`${invoices.length} Invoices`}
                actions={
                    <button
                        onClick={() => navigate('/invoices/new')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#FF7A18] hover:bg-[#FF923D] rounded-xl shadow-md shadow-[#FF7A18]/25 hover:shadow-[#FF7A18]/35 transition-all duration-150 cursor-pointer"
                    >
                        <Plus size={18} /> Direct Invoice
                    </button>
                }
            />
            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111726] p-5 rounded-2xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:border-[#FF7A18]/40 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-[#FF7A18]/15 border border-[#FF7A18]/30 flex items-center justify-center text-[#FF7A18]">
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Total Billed Revenue</p>
                        <h3 className="text-2xl font-black text-[#F8FAFC]">₹ {totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-[#111726] p-5 rounded-2xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:border-[#FF7A18]/40 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center text-[#F59E0B]">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Pending Balance</p>
                        <h3 className="text-2xl font-black text-[#F8FAFC]">₹ {pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-[#111726] p-5 rounded-2xl shadow-sm border border-[#1F2B45] flex items-center gap-4 hover:border-[#EF4444]/50 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center text-[#EF4444]">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Overdue Balance</p>
                        <h3 className="text-2xl font-black text-[#EF4444]">₹ {overdueBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-[#111726] p-4 rounded-2xl shadow-sm border border-[#1F2B45] mt-2">
                <div className="relative w-full lg:w-96">
                    <input
                        type="text"
                        placeholder="Search invoice number or customer..."
                        className="pl-10 w-full h-10 border border-[#1F2B45] rounded-xl focus:border-[#FF7A18] bg-[#172033] text-[#F8FAFC] outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => navigate('/invoices/new')}
                        className="flex items-center gap-2 text-xs font-bold text-white bg-[#FF7A18] px-3.5 py-2.5 rounded-xl border border-[#FF7A18] hover:bg-[#FF923D] shadow-sm transition-all cursor-pointer"
                        title="Create a Direct Custom Invoice"
                    >
                        <Plus size={16} />
                        Create Direct Invoice
                    </button>
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 text-xs font-bold text-[#22C55E] bg-[#22C55E]/15 px-3.5 py-2.5 rounded-xl border border-[#22C55E]/30 hover:bg-[#22C55E]/25 transition-all cursor-pointer"
                        title="Export Invoices to Excel Sheet"
                    >
                        <Download size={16} />
                        Export to Excel
                    </button>
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] bg-[#172033] px-3 py-2.5 rounded-xl cursor-pointer border border-[#1F2B45] hover:text-[#FF7A18] hover:border-[#FF7A18]/40 transition-colors">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-[#1F2B45] accent-[#FF7A18]"
                            checked={includeSignature}
                            onChange={e => setIncludeSignature(e.target.checked)}
                        />
                        Include Signature
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#94A3B8] bg-[#172033] px-3 py-2.5 rounded-xl cursor-pointer border border-[#1F2B45] hover:text-[#FF7A18] hover:border-[#FF7A18]/40 transition-colors">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-[#1F2B45] accent-[#FF7A18]"
                            checked={includeSeal}
                            onChange={e => setIncludeSeal(e.target.checked)}
                        />
                        Include Seal
                    </label>
                    <select
                        value={selectedTheme}
                        onChange={(e) => setSelectedTheme(e.target.value)}
                        className="text-xs font-semibold text-[#F8FAFC] bg-[#172033] px-3 py-2.5 rounded-xl border border-[#1F2B45] outline-none cursor-pointer"
                        title="Select PDF Theme"
                    >
                        <option value="indigo">Classic Indigo</option>
                        <option value="emerald">Forest Emerald</option>
                        <option value="crimson">Warm Crimson</option>
                        <option value="charcoal">Sleek Charcoal</option>
                        <option value="plain">Plain Black & White</option>
                    </select>
                    <select
                        value={copyType}
                        onChange={(e) => setCopyType(e.target.value)}
                        className="text-xs font-bold text-[#FF7A18] bg-[#FF7A18]/15 border border-[#FF7A18]/30 px-3 py-2.5 rounded-xl hover:bg-[#FF7A18]/25 outline-none cursor-pointer"
                        title="Select GST Document Copy Badge"
                    >
                        <option value="none">Standard Invoice (No Badge)</option>
                        <option value="original">Original</option>
                        <option value="duplicate">Duplicate</option>
                        <option value="triplicate">Triplicate</option>
                        <option value="filing">Office Copy</option>
                    </select>
                </div>
            </div>

            <div className="bg-[#111726] rounded-2xl shadow-sm border border-[#1F2B45] overflow-hidden min-h-[400px]">
                <div className="table-container !border-0 !rounded-none">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#172033] border-b border-[#1F2B45] text-xs uppercase tracking-wider text-[#94A3B8]">
                                <th className="p-4 font-semibold">Invoice #</th>
                                <th className="p-4 font-semibold">Customer</th>
                                <th className="p-4 font-semibold">Billed</th>
                                <th className="p-4 font-semibold">Balance</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F2B45]">
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="table-record-row hover:bg-[#FFF0E5] dark:hover:bg-[#172033]/60 transition-colors group cursor-pointer">
                                        <td className="p-4 font-bold text-[#FF7A18]">
                                            {editingId === invoice.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        className="border border-[#1F2B45] rounded-lg px-2 py-1 w-32 text-sm bg-[#172033] text-[#F8FAFC]"
                                                        value={editNumber}
                                                        onChange={e => setEditNumber(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={saveInvoiceNumber} disabled={saving} className="text-[#22C55E] hover:text-[#22C55E]/80 cursor-pointer"><Save size={16} /></button>
                                                    <button onClick={cancelEditing} className="text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group">
                                                    <FileText size={16} className="text-[#FF7A18]" />
                                                    {invoice.invoiceNumber}
                                                    <button
                                                        onClick={() => startEditing(invoice)}
                                                        className="opacity-0 group-hover:opacity-100 text-[#64748B] hover:text-[#FF7A18] transition-opacity p-1 cursor-pointer"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            {/* E-Way Bill Number Metadata Input / Display */}
                                            {editingEwayBillId === invoice.id ? (
                                                <div className="flex items-center gap-1 mt-1 text-[#F8FAFC]">
                                                    <input
                                                        className="border border-[#1F2B45] rounded px-1.5 py-0.5 text-xs w-28 font-normal bg-[#172033]"
                                                        value={editEwayBillNo}
                                                        placeholder="E-Way Bill No"
                                                        onChange={e => setEditEwayBillNo(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={saveEwayBillNo} disabled={saving} className="text-[#22C55E] hover:text-[#22C55E]/80 p-0.5 cursor-pointer"><Save size={12} /></button>
                                                    <button onClick={cancelEditingEwayBill} className="text-[#94A3B8] hover:text-[#F8FAFC] p-0.5 cursor-pointer"><X size={12} /></button>
                                                </div>
                                            ) : invoice.ewayBillNo ? (
                                                <div className="text-[10px] text-[#94A3B8] mt-1 flex items-center gap-1 group/ewb font-normal">
                                                    <span>E-Way Bill: {invoice.ewayBillNo}</span>
                                                    <button
                                                        onClick={() => startEditingEwayBill(invoice)}
                                                        className="opacity-0 group-hover/ewb:opacity-100 text-[#64748B] hover:text-[#FF7A18] transition-opacity p-0.5 bg-transparent border-none cursor-pointer"
                                                    >
                                                        <Edit size={10} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditingEwayBill(invoice)}
                                                    className="text-[10px] text-[#FF7A18] hover:text-[#FF923D] mt-1 flex items-center gap-1 underline font-normal cursor-pointer bg-transparent border-none"
                                                >
                                                    + Add E-Way Bill No
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-[#F8FAFC]">{invoice.customerName}</p>
                                            {editingDateId === invoice.id ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type="date"
                                                        className="border border-[#1F2B45] rounded px-2 py-0.5 text-[11px] bg-[#172033] text-[#F8FAFC]"
                                                        value={editDate}
                                                        onChange={e => setEditDate(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={saveInvoiceDate} disabled={saving} className="text-[#22C55E] hover:text-[#22C55E]/80 cursor-pointer"><Save size={14} /></button>
                                                    <button onClick={cancelEditingDate} className="text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-0.5 group/date">
                                                    <Clock size={10} />
                                                    {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : 'N/A'}
                                                    <button
                                                        onClick={() => startEditingDate(invoice)}
                                                        className="opacity-0 group-hover/date:opacity-100 text-[#64748B] hover:text-[#FF7A18] transition-opacity p-0.5 cursor-pointer"
                                                    >
                                                        <Edit size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 font-semibold text-[#F8FAFC]">₹ {invoice.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-4">
                                            {invoice.balance > 0 ? (
                                                <span className="font-bold text-[#EF4444]">₹ {invoice.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            ) : (
                                                <span className="font-semibold text-[#22C55E]">₹ 0.00</span>
                                            )}
                                            {invoice.dueDate && invoice.balance > 0 && (
                                                <div className="text-[10px] text-[#64748B] mt-0.5">Due: {format(new Date(invoice.dueDate), 'dd MMM yyyy')}</div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(invoice.computedStatus)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {invoice.balance > 0 && (
                                                    <button
                                                        onClick={() => { setPaymentInvoice(invoice); setPaymentAmount(invoice.balance); setShowPaymentModal(true); }}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-[#FF7A18]/15 text-[#FF7A18] hover:bg-[#FF7A18]/25 border border-[#FF7A18]/30 cursor-pointer"
                                                        title="Record Payment"
                                                    >
                                                        Pay
                                                    </button>
                                                )}

                                                {isEWayBillRequired(invoice) && (
                                                    <button
                                                        onClick={() => handleDownloadEWayBill(invoice)}
                                                        className="p-1.5 text-[#38BDF8] hover:bg-[#38BDF8]/15 border border-[#1F2B45] rounded-lg transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer"
                                                        title="Download e-Way Bill JSON"
                                                    >
                                                        <Truck size={18} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleShareWhatsApp(invoice)}
                                                    className="p-1.5 text-[#22C55E] hover:bg-[#22C55E]/15 border border-[#1F2B45] rounded-lg transition-all flex items-center gap-1 text-xs font-medium cursor-pointer"
                                                    title="Share via WhatsApp"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>

                                                <button
                                                    onClick={() => handleInitiateEdit(invoice.id)}
                                                    className="p-1.5 text-[#F59E0B] hover:bg-[#F59E0B]/15 rounded-lg transition-colors border border-[#1F2B45] cursor-pointer"
                                                    title="Edit Invoice Details (Admin Password Required)"
                                                >
                                                    <Edit size={18} />
                                                </button>

                                                <button
                                                    onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                                                    disabled={downloadingId === invoice.id}
                                                    className="p-1.5 text-[#FF7A18] hover:bg-[#FF7A18]/15 rounded-lg transition-colors border border-[#1F2B45] cursor-pointer"
                                                    title="Download PDF"
                                                >
                                                    {downloadingId === invoice.id ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
                                                </button>

                                                <button
                                                    onClick={() => handlePrint(invoice.id)}
                                                    disabled={printingId === invoice.id}
                                                    className="p-1.5 text-[#94A3B8] hover:text-[#FF7A18] hover:bg-[#FF7A18]/15 hover:border-[#FF7A18]/30 rounded-lg transition-colors border border-[#1F2B45] cursor-pointer"
                                                    title="Quick Print"
                                                >
                                                    {printingId === invoice.id ? <Loader size={18} className="animate-spin" /> : <Printer size={18} />}
                                                </button>

                                                <div className="relative" ref={activeDropdown === invoice.id ? dropdownRef : null}>
                                                    <button
                                                        className="p-1.5 text-[#64748B] hover:text-[#FF7A18] hover:bg-[#FF7A18]/15 rounded-lg transition-colors cursor-pointer"
                                                        onClick={() => setActiveDropdown(activeDropdown === invoice.id ? null : invoice.id)}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>

                                                    {activeDropdown === invoice.id && (
                                                        <div className="absolute right-0 mt-1 w-48 bg-[#111726] border border-[#1F2B45] rounded-xl shadow-2xl z-50 py-1.5 text-xs text-left">
                                                            <button 
                                                                onClick={() => { handleOpenEmailCustomerModal(invoice); setActiveDropdown(null); }} 
                                                                disabled={sendingEmailId === invoice.id}
                                                                className="w-full text-left px-4 py-2 text-[#38BDF8] hover:bg-[#38BDF8]/15 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                                                            >
                                                                {sendingEmailId === invoice.id ? <Loader size={14} className="animate-spin text-[#38BDF8]" /> : <Mail size={14} className="text-[#38BDF8]" />}
                                                                <span>Email to Customer</span>
                                                            </button>
                                                            <button 
                                                                onClick={() => { handleEmailToMe(invoice); setActiveDropdown(null); }} 
                                                                disabled={sendingEmailId === invoice.id}
                                                                className="w-full text-left px-4 py-2 text-[#FF7A18] hover:bg-[#FF7A18]/15 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                                                            >
                                                                {sendingEmailId === invoice.id ? <Loader size={14} className="animate-spin text-[#FF7A18]" /> : <Mail size={14} className="text-[#FF7A18]" />}
                                                                <span>Email to Myself</span>
                                                            </button>
                                                            <button onClick={() => { handleViewPdf(invoice.id); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[#F8FAFC] hover:bg-[#FFF0E5] hover:text-[#FF7A18] flex items-center gap-2 cursor-pointer transition-colors">
                                                                <Eye size={14} className="text-[#94A3B8]" /> View Open PDF
                                                            </button>
                                                            <button onClick={() => { handleShareWhatsApp(invoice, true); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[#22C55E] hover:bg-[#FFF0E5] hover:text-[#16A34A] flex items-center gap-2 cursor-pointer transition-colors">
                                                                <MessageCircle size={14} /> WhatsApp to Admin
                                                            </button>
                                                            <button onClick={() => { handleDelete(invoice.id); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-[#EF4444] hover:bg-[#FEE2E2] hover:text-[#DC2626] flex items-center gap-2 cursor-pointer border-t border-[#1F2B45] mt-1 pt-2 transition-colors">
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-8">
                                        <EmptyState
                                            icon={FileText}
                                            title="No invoices found"
                                            description={searchTerm ? "No invoices match your search query." : "Convert an approved quotation or create your first direct invoice."}
                                            actionText="Create Direct Invoice"
                                            actionLink="/invoices/new"
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && paymentInvoice && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleRecordPayment} className="bg-[#111726] rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slideDown border border-[#1F2B45]">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-bold text-[#F8FAFC]">Record Payment</h3>
                            <button type="button" onClick={() => setShowPaymentModal(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"><X size={18} /></button>
                        </div>
                        <p className="text-xs text-[#94A3B8] mb-5">Enter payment amount for invoice <strong className="text-[#F8FAFC]">{paymentInvoice.invoiceNumber}</strong>.</p>

                        <div className="bg-[#172033] rounded-xl p-3 mb-4 space-y-1.5 text-xs border border-[#1F2B45]">
                            <div className="flex justify-between"><span className="text-[#94A3B8]">Total Billed:</span> <strong className="text-[#F8FAFC]">₹ {paymentInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                            <div className="flex justify-between"><span className="text-[#94A3B8]">Previously Paid:</span> <strong className="text-[#22C55E]">₹ {paymentInvoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                            <div className="border-t border-[#1F2B45] my-1 pt-1 flex justify-between"><span className="font-bold text-[#F8FAFC]">Remaining Balance:</span> <strong className="text-[#EF4444]">₹ {paymentInvoice.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Payment Amount</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    max={paymentInvoice.balance}
                                    className="w-full px-3 py-2 border border-[#1F2B45] rounded-xl focus:border-[#FF7A18] bg-[#172033] text-[#F8FAFC] outline-none"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={processingPayment} className="w-full btn btn-primary flex justify-center py-2.5 shadow-md shadow-[#FF7A18]/25">
                            {processingPayment ? 'Processing...' : 'Apply Payment'}
                        </button>
                    </form>
                </div>
            )}

            {/* Admin Security Verification Modal */}
            {showSecurityModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111726] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#1F2B45] animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] flex items-center justify-center">
                                    <Lock size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#F8FAFC]">Admin Verification</h3>
                                    <p className="text-xs text-[#94A3B8]">Security password required to edit invoice</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSecurityModal(false)}
                                className="text-[#94A3B8] hover:text-[#F8FAFC] p-1 cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleVerifyAndProceed} className="space-y-4">
                            {securityError && (
                                <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    {securityError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
                                    Admin Account Password
                                </label>
                                <input
                                    type="password"
                                    value={adminPassword}
                                    onChange={(e) => { setAdminPassword(e.target.value); setSecurityError(''); }}
                                    placeholder="Enter your password to unlock"
                                    className="w-full px-4 py-2.5 border border-[#1F2B45] rounded-xl focus:border-[#FF7A18] bg-[#172033] text-[#F8FAFC] outline-none text-sm"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowSecurityModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={verifyingPassword || !adminPassword}
                                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#FF7A18] hover:bg-[#FF923D] rounded-xl shadow-md shadow-[#FF7A18]/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {verifyingPassword ? <Loader size={16} className="animate-spin" /> : <Lock size={16} />}
                                    Unlock & Edit Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Email Invoice to Customer Modal */}
            {customerEmailModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-[#111726] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#1F2B45] animate-scaleUp">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] flex items-center justify-center">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#F8FAFC]">Email Invoice to Customer</h3>
                                    <p className="text-xs text-[#94A3B8]">Sends official PDF attachment via Resend</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCustomerEmailModal({ isOpen: false, invoice: null, email: '', saveToCustomer: true, error: '' })}
                                className="text-[#94A3B8] hover:text-[#F8FAFC] p-1 cursor-pointer transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-3 bg-[#172033] border border-[#1F2B45] rounded-xl mb-4 text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-[#94A3B8]">Invoice Number:</span>
                                <span className="font-bold text-[#F8FAFC]">{customerEmailModal.invoice?.invoiceNumber}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#94A3B8]">Customer:</span>
                                <span className="font-semibold text-[#F8FAFC]">{customerEmailModal.invoice?.customerName || customerEmailModal.invoice?.customerId?.name || 'Customer'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[#94A3B8]">Invoice Total:</span>
                                <span className="font-bold text-[#FF7A18]">₹{Number(customerEmailModal.invoice?.total || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSendCustomerEmail} className="space-y-4">
                            {customerEmailModal.error && (
                                <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] rounded-xl text-xs font-semibold flex items-center gap-2">
                                    <AlertTriangle size={16} />
                                    <span>{customerEmailModal.error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
                                    Customer Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={customerEmailModal.email}
                                    onChange={(e) => setCustomerEmailModal(prev => ({ ...prev, email: e.target.value, error: '' }))}
                                    placeholder="e.g. client@example.com"
                                    className="w-full px-4 py-2.5 border border-[#1F2B45] rounded-xl focus:border-[#38BDF8] bg-[#172033] text-[#F8FAFC] outline-none text-sm placeholder-[#64748B]"
                                    autoFocus
                                    required
                                />
                            </div>

                            {customerEmailModal.invoice?.customerId?._id && (
                                <label className="flex items-center gap-2.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={customerEmailModal.saveToCustomer}
                                        onChange={(e) => setCustomerEmailModal(prev => ({ ...prev, saveToCustomer: e.target.checked }))}
                                        className="w-4 h-4 rounded border-[#1F2B45] text-[#FF7A18] focus:ring-[#FF7A18] bg-[#172033] cursor-pointer"
                                    />
                                    <span>Save this email to customer profile for future invoices</span>
                                </label>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCustomerEmailModal({ isOpen: false, invoice: null, email: '', saveToCustomer: true, error: '' })}
                                    className="px-4 py-2 text-xs font-semibold text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#172033] rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingEmailId === (customerEmailModal.invoice?.id || customerEmailModal.invoice?._id) || !customerEmailModal.email}
                                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#0284C7] hover:bg-[#0369A1] rounded-xl shadow-md shadow-[#0284C7]/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                                >
                                    {sendingEmailId === (customerEmailModal.invoice?.id || customerEmailModal.invoice?._id) ? (
                                        <>
                                            <Loader size={16} className="animate-spin" />
                                            <span>Sending via Resend...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            <span>Send Invoice PDF</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Invoices;
