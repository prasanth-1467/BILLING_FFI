import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, Loader, Download, FileText, CheckCircle, Clock, Eye, Trash2, Edit, Save, X, MoreVertical, IndianRupee, MessageCircle, AlertTriangle, Printer, Mail, Plus, Truck } from 'lucide-react';
import { downloadEWayBillJSON } from '../utils/ewayBillFormatter';
import { format, isPast, startOfDay } from 'date-fns';

const Invoices = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const [printingId, setPrintingId] = useState(null);
    const [includeSignature, setIncludeSignature] = useState(false);
    const [includeSeal, setIncludeSeal] = useState(false);
    const [selectedTheme, setSelectedTheme] = useState('indigo');

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
                params: { includeSignature, includeSeal, theme: selectedTheme },
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
        const customerPhone = invoice.customerId?.phone;
        const targetPhone = toAdmin ? adminPhone : customerPhone;
        if (!targetPhone) {
            alert(toAdmin ? 'Admin phone number is not configured in .env file.' : 'Customer does not have a phone number saved.');
            return;
        }
        const text = `Hello ${toAdmin ? 'Admin' : invoice.customerName},\n\n${toAdmin ? '*Admin Copy* of ' : ''}Invoice *${invoice.invoiceNumber}* for *₹${Number(invoice.totalAmount).toLocaleString('en-IN')}* has been generated.\nPending Balance: *₹${Number(invoice.balance).toLocaleString('en-IN')}*.\nDue Date: ${invoice.dueDate ? format(new Date(invoice.dueDate), 'dd MMM yyyy') : 'Immediate'}.\n\nThank you!`;
        const wsUrl = `https://wa.me/${targetPhone.startsWith('91') ? targetPhone : '91' + targetPhone}?text=${encodeURIComponent(text)}`;
        window.open(wsUrl, '_blank');
    };

    const handleEmailToMe = async (invoice) => {
        try {
            setSaving(true);
            setDownloadingId(invoice.id);
            await api.post(`/invoices/${invoice.id}/email-to-me?includeSignature=${includeSignature}&includeSeal=${includeSeal}&theme=${selectedTheme}`);
            alert("Copy sent to admin email successfully!");
        } catch (error) {
            console.error('Email failed', error);
            alert(error.response?.data?.error || 'Failed to send email. Check .env configuration.');
        } finally {
            setSaving(false);
            setDownloadingId(null);
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
        window.open(`${import.meta.env.VITE_API_URL}/invoices/${id}/pdf?includeSignature=${includeSignature}&includeSeal=${includeSeal}&theme=${selectedTheme}`, '_blank', 'noopener,noreferrer');
    };

    const handlePrint = async (id) => {
        try {
            setPrintingId(id);
            const response = await api.get(`/invoices/${id}/pdf`, {
                params: { includeSignature, includeSeal, theme: selectedTheme },
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
            case 'Paid': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-200 bg-green-50 text-green-700">Paid</span>;
            case 'Partially Paid': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-200 bg-blue-50 text-blue-700">Partially Paid</span>;
            case 'Overdue': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-red-200 bg-red-50 text-red-700">Overdue</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border border-orange-200 bg-orange-50 text-orange-700">Pending</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <Loader className="animate-spin mr-2" /> Loading Invoices Workflow...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <IndianRupee size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Billed Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900">₹ {totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Balance</p>
                        <h3 className="text-2xl font-bold text-gray-900">₹ {pendingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Overdue Balance</p>
                        <h3 className="text-2xl font-bold text-red-600">₹ {overdueBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 mt-2">
                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Search invoice number or customer..."
                        className="pl-10 w-full h-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50/50 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/invoices/new')}
                        className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 px-4 py-2.5 rounded-lg border border-blue-700 hover:bg-blue-700 shadow-sm transition-all hover:shadow-md cursor-pointer"
                        title="Create a Direct Custom Invoice"
                    >
                        <Plus size={16} />
                        Create Direct Invoice
                    </button>
                    <button
                        onClick={handleExportToExcel}
                        className="flex items-center gap-2 text-sm font-medium text-white bg-green-600 px-4 py-2.5 rounded-lg border border-green-700 hover:bg-green-700 shadow-sm transition-all hover:shadow-md cursor-pointer"
                        title="Export Invoices to Excel Sheet"
                    >
                        <Download size={16} />
                        Export to Excel
                    </button>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg cursor-pointer border hover:bg-gray-100">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            checked={includeSignature}
                            onChange={e => setIncludeSignature(e.target.checked)}
                        />
                        Include Signature on PDFs
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg cursor-pointer border hover:bg-gray-100">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            checked={includeSeal}
                            onChange={e => setIncludeSeal(e.target.checked)}
                        />
                        Include Seal on PDFs
                    </label>
                    <select
                        value={selectedTheme}
                        onChange={(e) => setSelectedTheme(e.target.value)}
                        className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2.5 rounded-lg border hover:bg-gray-100 outline-none cursor-pointer"
                        title="Select PDF Theme"
                    >
                        <option value="indigo">Classic Indigo</option>
                        <option value="emerald">Forest Emerald</option>
                        <option value="crimson">Warm Crimson</option>
                        <option value="charcoal">Sleek Charcoal</option>
                        <option value="plain">Plain Black & White</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                <div className="table-container">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                <th className="p-4 font-semibold">Invoice #</th>
                                <th className="p-4 font-semibold">Customer</th>
                                <th className="p-4 font-semibold">Billed</th>
                                <th className="p-4 font-semibold">Balance</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInvoices.length > 0 ? (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-blue-50/20 transition-colors group">
                                        <td className="p-4 font-medium text-blue-600">
                                            {editingId === invoice.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        className="border border-gray-200 rounded px-2 py-1 w-32 text-sm"
                                                        value={editNumber}
                                                        onChange={e => setEditNumber(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={saveInvoiceNumber} disabled={saving} className="text-green-600 hover:text-green-800"><Save size={16} /></button>
                                                    <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-700"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group">
                                                    <FileText size={16} className="text-blue-400" />
                                                    {invoice.invoiceNumber}
                                                    <button
                                                        onClick={() => startEditing(invoice)}
                                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            {/* E-Way Bill Number Metadata Input / Display */}
                                            {editingEwayBillId === invoice.id ? (
                                                <div className="flex items-center gap-1 mt-1 text-slate-800">
                                                    <input
                                                        className="border border-gray-200 rounded px-1.5 py-0.5 text-xs w-28 font-normal"
                                                        value={editEwayBillNo}
                                                        placeholder="E-Way Bill No"
                                                        onChange={e => setEditEwayBillNo(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={saveEwayBillNo} disabled={saving} className="text-green-600 hover:text-green-800 p-0.5"><Save size={12} /></button>
                                                    <button onClick={cancelEditingEwayBill} className="text-gray-500 hover:text-gray-700 p-0.5"><X size={12} /></button>
                                                </div>
                                            ) : invoice.ewayBillNo ? (
                                                <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 group/ewb font-normal">
                                                    <span>E-Way Bill: {invoice.ewayBillNo}</span>
                                                    <button
                                                        onClick={() => startEditingEwayBill(invoice)}
                                                        className="opacity-0 group-hover/ewb:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-0.5 bg-transparent border-none cursor-pointer"
                                                    >
                                                        <Edit size={10} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEditingEwayBill(invoice)}
                                                    className="text-[10px] text-blue-500 hover:text-blue-700 mt-1 flex items-center gap-1 underline font-normal cursor-pointer bg-transparent border-none"
                                                >
                                                    + Add E-Way Bill No
                                                </button>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-900">{invoice.customerName}</p>
                                            {editingDateId === invoice.id ? (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <input
                                                        type="date"
                                                        className="border border-gray-200 rounded px-2 py-0.5 text-[11px]"
                                                        value={editDate}
                                                        onChange={e => setEditDate(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button onClick={saveInvoiceDate} disabled={saving} className="text-green-600 hover:text-green-800"><Save size={14} /></button>
                                                    <button onClick={cancelEditingDate} className="text-gray-500 hover:text-gray-700"><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5 group/date">
                                                    <Clock size={10} /> 
                                                    {invoice.date ? format(new Date(invoice.date), 'dd MMM yyyy') : 'N/A'}
                                                    <button
                                                        onClick={() => startEditingDate(invoice)}
                                                        className="opacity-0 group-hover/date:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-0.5"
                                                    >
                                                        <Edit size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium text-gray-900">₹ {invoice.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-4">
                                            {invoice.balance > 0 ? (
                                                <span className="font-bold text-red-600">₹ {invoice.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                            ) : (
                                                <span className="font-medium text-green-600">₹ 0.00</span>
                                            )}
                                            {invoice.dueDate && invoice.balance > 0 && (
                                                <div className="text-[10px] text-gray-400 mt-0.5">Due: {format(new Date(invoice.dueDate), 'dd MMM yyyy')}</div>
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
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                                                        title="Record Payment"
                                                    >
                                                        Pay
                                                    </button>
                                                )}

                                                {isEWayBillRequired(invoice) && (
                                                    <button
                                                        onClick={() => handleDownloadEWayBill(invoice)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-md transition-all flex items-center gap-1 text-xs font-semibold"
                                                        title="Download e-Way Bill JSON"
                                                    >
                                                        <Truck size={18} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleShareWhatsApp(invoice)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 border border-transparent hover:border-green-100 rounded-md transition-all flex items-center gap-1 text-xs font-medium"
                                                    title="Share via WhatsApp"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>

                                                <button
                                                    onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                                                    disabled={downloadingId === invoice.id}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent"
                                                    title="Download PDF"
                                                >
                                                    {downloadingId === invoice.id ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
                                                </button>

                                                <button
                                                    onClick={() => handlePrint(invoice.id)}
                                                    disabled={printingId === invoice.id}
                                                    className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-md transition-colors border border-transparent"
                                                    title="Quick Print"
                                                >
                                                    {printingId === invoice.id ? <Loader size={18} className="animate-spin" /> : <Printer size={18} />}
                                                </button>

                                                <div className="relative" ref={activeDropdown === invoice.id ? dropdownRef : null}>
                                                    <button
                                                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                                        onClick={() => setActiveDropdown(activeDropdown === invoice.id ? null : invoice.id)}
                                                    >
                                                        <MoreVertical size={18} />
                                                    </button>

                                                    {activeDropdown === invoice.id && (
                                                        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-xl z-50 py-1 text-sm text-left">
                                                            <button onClick={() => { handleViewPdf(invoice.id); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                                <Eye size={14} /> View Open PDF
                                                            </button>
                                                            <button onClick={() => { handleShareWhatsApp(invoice, true); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-green-600 hover:bg-green-50 flex items-center gap-2">
                                                                <MessageCircle size={14} /> Share to Me
                                                            </button>
                                                            <button onClick={() => { handleEmailToMe(invoice); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                                                                <Mail size={14} /> Email to Me
                                                            </button>
                                                            <button onClick={() => { handleDelete(invoice.id); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2">
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
                                    <td colSpan="6" className="text-center py-16">
                                        <div className="flex flex-col items-center text-gray-400">
                                            <FileText size={48} className="mb-4 opacity-20" />
                                            <p className="text-lg font-medium text-gray-500">No invoices found</p>
                                            <p className="text-sm mt-1">Convert a quotation to create your first invoice.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && paymentInvoice && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleRecordPayment} className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-slideDown">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
                            <button type="button" onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">Enter payment amount for invoice <strong className="text-gray-800">{paymentInvoice.invoiceNumber}</strong>.</p>

                        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Total Billed:</span> <strong className="text-gray-900">₹ {paymentInvoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                            <div className="flex justify-between"><span className="text-gray-500">Previously Paid:</span> <strong className="text-green-600">₹ {paymentInvoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                            <div className="border-t border-gray-200 my-1 pt-1 flex justify-between"><span className="font-bold text-gray-700">Remaining Balance:</span> <strong className="text-red-600">₹ {paymentInvoice.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                        </div>

                        <div className="mb-5">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Payment Amount</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    max={paymentInvoice.balance}
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={processingPayment} className="w-full btn btn-primary flex justify-center py-2.5 shadow-sm">
                            {processingPayment ? 'Processing...' : 'Apply Payment'}
                        </button>
                    </form>
                </div>
            )}
        </div >
    );
};

export default Invoices;
