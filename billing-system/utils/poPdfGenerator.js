const PDFDocument = require("pdfkit");
const company = require("../config/companyDetails");
const fs = require('fs');
const path = require('path');

function generatePoPDF(res, po) {
    const includeSignature = po?.includeSignature === true;
    const includeSeal = po?.includeSeal === true;
    const theme = po.theme || require("../config/themeConfig").indigo;
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

    // Stream to response
    doc.pipe(res);
    doc.fillColor(theme.primary);

    // ===========================
    // SECTION 1: DOCUMENT TITLE & COMPANY INFO
    // ===========================
    let y = 40;

    // Company Name
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#1E3A8A").text(company.name, { align: "center" });
    doc.fillColor(theme.primary); // Restore color
    y += 20;

    // Company Address & Contact
    doc.fontSize(9).font("Helvetica");
    doc.text(company.address, { align: "center" });
    y += 12;
    doc.text(`GSTIN: ${company.gstin} | Phone: ${company.phone} | Email: ${company.email}`, { align: "center" });
    y += 25;

    // Title (BELOW Company Info)
    doc.fontSize(16).font("Helvetica-Bold").text("PURCHASE ORDER", 40, y, { align: "center" });
    y += 25;

    drawLine(doc, y, theme.accent);
    y += 15;

    // ===========================
    // SECTION 2: SUPPLIER + PO DETAILS
    // ===========================
    const leftColX = 40;
    const rightColX = 350;
    const colWidth = 230;
    const startSection2Y = y;

    // Calculate Supplier Block Height
    let supplierHeight = 15;
    const activeSupplier = po.supplier || {
        name: po.supplierName,
        address: po.supplierAddress,
        gstin: po.supplierGSTIN,
        phone: po.supplierPhone,
        email: po.supplierEmail
    };

    if (activeSupplier && activeSupplier.name) {
        supplierHeight += doc.heightOfString(activeSupplier.name || "-", { width: colWidth - 10 }) + 2;
        if (activeSupplier.address) {
            supplierHeight += doc.heightOfString(activeSupplier.address, { width: colWidth - 10 }) + 2;
        }
        if (activeSupplier.gstin) {
            supplierHeight += 12;
        }
        if (activeSupplier.phone) {
            supplierHeight += 12;
        }
    } else {
        supplierHeight += 12;
    }

    const poDetailsHeight = 15 + 12 + 12 + (po.expectedDeliveryDate ? 12 : 0) + 15;
    const blockHeight2 = Math.max(supplierHeight, poDetailsHeight) + 10;

    // Draw cards first
    doc.roundedRect(38, y - 5, 235, blockHeight2, 6).fill(theme.tableHeaderBg);
    doc.roundedRect(348, y - 5, 207, blockHeight2, 6).fill(theme.tableHeaderBg);

    // Overlay Left Block: Supplier
    doc.fillColor(theme.primary).fontSize(10).font("Helvetica-Bold").text("To (Supplier):", 45, y);
    if (activeSupplier && activeSupplier.name) {
        doc.font("Helvetica-Bold").text(activeSupplier.name, 45, doc.y, { width: colWidth - 10 });
        doc.font("Helvetica").fillColor(theme.secondaryText);
        if (activeSupplier.address) {
            doc.text(activeSupplier.address, 45, doc.y, { width: colWidth - 10 });
        }
        if (activeSupplier.gstin) {
            doc.text(`GSTIN: ${activeSupplier.gstin}`, 45, doc.y, { width: colWidth - 10 });
        }
        if (activeSupplier.phone) {
            doc.text(`Phone: ${activeSupplier.phone}`, 45, doc.y, { width: colWidth - 10 });
        }
    } else {
        doc.font("Helvetica").fillColor(theme.secondaryText).text("Unknown Supplier", 45, doc.y);
    }

    // Overlay Right Block: PO Details
    doc.fillColor(theme.primary).fontSize(10).font("Helvetica-Bold").text("PO Details:", 355, y);
    doc.font("Helvetica").fontSize(10).fillColor(theme.secondaryText);
    doc.text(`PO No: ${po.poNumber}`, 355, doc.y);
    doc.text(`Date: ${new Date(po.date).toLocaleDateString("en-IN")}`);
    if (po.expectedDeliveryDate) {
        doc.text(`Exp. Delivery: ${new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN")}`);
    }

    // Restore primary color
    doc.fillColor(theme.primary);

    // End of Section 2
    y = y + blockHeight2 + 10;
    drawLine(doc, y, theme.accent);
    y += 15;

    // ===========================
    // SECTION 3: BILL TO + SHIP TO
    // ===========================
    // Calculate heights for Section 3 cards
    const billToHeight = 15
        + doc.heightOfString(company.name, { width: colWidth - 10 })
        + doc.heightOfString(company.address, { width: colWidth - 10 })
        + 12 // GSTIN
        + 12 // Phone
        + 12 // Email
        + 10;

    const shipToHeight = 15
        + doc.heightOfString(company.name, { width: colWidth - 10 })
        + doc.heightOfString(company.address, { width: colWidth - 10 })
        + 10;

    const blockHeight3 = Math.max(billToHeight, shipToHeight) + 10;

    // Draw cards first
    doc.roundedRect(38, y - 5, 235, blockHeight3, 6).fill(theme.tableHeaderBg);
    doc.roundedRect(348, y - 5, 207, blockHeight3, 6).fill(theme.tableHeaderBg);

    // Overlay Left Block: Bill To
    doc.fillColor(theme.primary).fontSize(10).font("Helvetica-Bold").text("Bill To:", 45, y);
    doc.font("Helvetica-Bold").text(company.name, 45, doc.y, { width: colWidth - 10 });
    doc.font("Helvetica").fillColor(theme.secondaryText);
    doc.text(company.address, 45, doc.y, { width: colWidth - 10 });
    doc.text(`GSTIN: ${company.gstin}`, 45, doc.y);
    doc.text(`Phone: ${company.phone}`, 45, doc.y);
    doc.text(`Email: ${company.email}`, 45, doc.y);

    // Overlay Right Block: Ship To
    doc.fillColor(theme.primary).fontSize(10).font("Helvetica-Bold").text("Ship To:", 355, y);
    doc.font("Helvetica-Bold").text(company.name, 355, doc.y, { width: colWidth - 10 });
    doc.font("Helvetica").fillColor(theme.secondaryText);
    doc.text(company.address, 355, doc.y, { width: colWidth - 10 });

    // Restore primary color
    doc.fillColor(theme.primary);

    // End of Section 3
    y = y + blockHeight3 + 15;

    // ===========================
    // SECTION 4: ITEMS TABLE
    // ===========================

    const colX = {
        sl: 40,
        prod: 70,
        model: 220,
        gst: 300,
        qty: 340,
        unit: 380,
        rate: 430,
        amount: 500
    };
    const colW = {
        sl: 30,
        prod: 140,
        model: 70,
        gst: 35,
        qty: 35,
        unit: 40,
        rate: 60,
        amount: 60
    };

    const drawHeader = (currY) => {
        doc.rect(40, currY - 5, 525, 20).fill(theme.tableHeaderBg);
        doc.fillColor(theme.tableHeaderText);

        doc.fontSize(9).font("Helvetica-Bold");
        doc.text("S.No", colX.sl, currY, { width: colW.sl, align: "center" });
        doc.text("Product / Description", colX.prod, currY, { width: colW.prod });
        doc.text("Model No", colX.model, currY, { width: colW.model, align: "center" });
        doc.text("GST%", colX.gst, currY, { width: colW.gst, align: "center" });
        doc.text("Qty", colX.qty, currY, { width: colW.qty, align: "center" });
        doc.text("Unit", colX.unit, currY, { width: colW.unit, align: "center" });
        doc.text("Rate", colX.rate, currY, { width: colW.rate, align: "right" });
        doc.text("Amount", colX.amount, currY, { width: colW.amount, align: "right" });

        doc.fillColor(theme.primary);
    };

    drawHeader(y);
    y += 25;

    // Items Loop
    let subtotal = 0;
    const taxSlabs = {};

    doc.font("Helvetica").fontSize(9);

    po.items.forEach((item, i) => {
        const rate = Number(item.rate || 0);
        const qty = Number(item.qty || 0);
        const gstRate = Number(item.gstRate || 0);
        const amount = qty * rate;

        subtotal += amount;

        // ACCUMULATE TAX
        if (gstRate > 0) {
            if (!taxSlabs[gstRate]) taxSlabs[gstRate] = { taxable: 0, tax: 0 };
            const taxAmount = (amount * gstRate) / 100;
            taxSlabs[gstRate].taxable += amount;
            taxSlabs[gstRate].tax += taxAmount;
        }

        const productName = item.product ? (item.product.name || item.name) : (item.name || "Unknown Item");
        const productCode = item.product ? (item.product.productCode || item.product.code) : (item.productCode || "");
        const displayName = productCode ? `${productName}\n(Code: ${productCode})` : productName;
        const modelNo = item.modelNo || "-";

        // Dynamic Height
        const descHeight = doc.heightOfString(displayName, { width: colW.prod });
        const modelHeight = doc.heightOfString(modelNo, { width: colW.model });
        const rowHeight = Math.max(descHeight, modelHeight, 15) + 10;

        // Page Break
        if (y + rowHeight > 700) {
            doc.addPage();
            drawPageHeader(doc, po, theme);
            y = 85;
            drawHeader(y);
            y += 25;
            doc.font("Helvetica").fontSize(9);
        }

        doc.fillColor(theme.primary);
        doc.text(i + 1, colX.sl, y, { width: colW.sl, align: "center" });
        doc.text(displayName, colX.prod, y, { width: colW.prod });
        doc.text(modelNo, colX.model, y, { width: colW.model, align: "center" });
        doc.text(`${gstRate}%`, colX.gst, y, { width: colW.gst, align: "center" });
        doc.text(qty, colX.qty, y, { width: colW.qty, align: "center" });
        doc.text(item.unit || "-", colX.unit, y, { width: colW.unit, align: "center" });
        doc.text(rate.toFixed(2), colX.rate, y, { width: colW.rate, align: "right" });
        doc.text(amount.toFixed(2), colX.amount, y, { width: colW.amount, align: "right" });

        y += rowHeight;
    });

    drawLine(doc, y, theme.accent);
    y += 10;

    // --- TOTALS & TAX BREAKDOWN ---
    let totalTax = 0;
    Object.values(taxSlabs).forEach(s => totalTax += s.tax);
    let totalAmount = subtotal + totalTax;

    const roundedTotal = Math.round(totalAmount);
    const roundOff = roundedTotal - totalAmount;

    const totalsX = 350;

    doc.fillColor(theme.secondaryText);
    // Subtotal
    doc.text(`Subtotal (Taxable):`, totalsX, y);
    doc.text(subtotal.toFixed(2), 0, y, { align: "right" });
    y += 15;

    // Render Tax Slabs
    Object.keys(taxSlabs).sort((a, b) => Number(a) - Number(b)).forEach(rateKey => {
        const slab = taxSlabs[rateKey];
        const rate = Number(rateKey);

        const halfRate = rate / 2;
        const halfTax = slab.tax / 2;

        doc.text(`CGST @ ${halfRate}%:`, totalsX, y);
        doc.text(halfTax.toFixed(2), 0, y, { align: "right" });
        y += 15;

        doc.text(`SGST @ ${halfRate}%:`, totalsX, y);
        doc.text(halfTax.toFixed(2), 0, y, { align: "right" });
        y += 15;
    });

    if (Math.abs(roundOff) > 0) {
        doc.text(`Round Off:`, totalsX, y);
        doc.text(roundOff.toFixed(2), 0, y, { align: "right" });
        y += 15;
    }

    doc.fontSize(12).font("Helvetica-Bold").fillColor(theme.primary);
    doc.text(`Grand Total:`, totalsX, y);
    doc.text(`Rs. ${roundedTotal.toFixed(2)}`, 0, y, { align: "right" });

    drawLine(doc, y + 15, theme.accent);
    y += 25;
    const wordsRepresentation = numberToRupeesWords(roundedTotal);
    doc.fillColor(theme.secondaryText).font("Helvetica-Oblique").fontSize(9).text(`Amount in Words: ${wordsRepresentation}`, 40, y);
    y += 25;

    // ===========================
    // FOOTER: TERMS & SIGNATORY
    // ===========================
    const terms = [
        "1. Full payment shall be made in accordance with the mutually agreed terms.",
        "2. The supplier is required to provide materials strictly in line with the specifications outlined in this Purchase Order.",
        "3. Delivery must be completed within the agreed timeline.",
    ];

    doc.fontSize(9).font("Helvetica");

    // Calculate Height needed
    let termsHeight = 15;
    terms.forEach(term => {
        termsHeight += doc.heightOfString(term, { width: 300 }) + 5;
    });
    const signatoryHeight = 80;
    const requiredHeight = Math.max(termsHeight, signatoryHeight) + 20;

    // Page Break Check for Footer
    const bottomY = doc.page.height - doc.page.margins.bottom - requiredHeight;

    if (y > bottomY) {
        doc.addPage();
        drawPageHeader(doc, po, theme);
    }

    const footerY = doc.page.height - doc.page.margins.bottom - requiredHeight;

    // Terms (Left - 60%)
    doc.fontSize(10).font("Helvetica-Bold").fillColor(theme.primary).text("Terms & Conditions:", 40, footerY);
    doc.fontSize(9).font("Helvetica").fillColor(theme.secondaryText);
    let currentTermY = footerY + 15;

    terms.forEach(term => {
        doc.text(term, 40, currentTermY, { width: 300 });
        currentTermY += doc.heightOfString(term, { width: 300 }) + 3;
    });

    // Signatory (Right - 40%)
    doc.fontSize(10).font("Helvetica-Bold").fillColor(theme.primary).text(`For ${company.name}`, 350, footerY, { align: "right", width: 200 });

    const signaturePath = path.join(__dirname, '../assets/Signature.png');
    const sealPathDefault = path.join(__dirname, '../assets/Seal.png');
    const sealPathFFI = path.join(__dirname, '../assets/Seal_FFI.png');
    const sealPath = fs.existsSync(sealPathFFI) ? sealPathFFI : sealPathDefault;
    const hasSignature = includeSignature && fs.existsSync(signaturePath);
    const hasSeal = includeSeal && fs.existsSync(sealPath);

    if (hasSeal) {
        try {
            doc.image(sealPath, 340, footerY + 10, { width: 75 });
        } catch (err) {
            console.error("Error loading seal image:", err);
        }
    }

    if (hasSignature) {
        try {
            doc.image(signaturePath, 450, footerY + 15, { width: 80 });
        } catch (err) {
            console.error("Error loading signature image:", err);
        }
    }

    // Adjust Text Y position: Push down further if signature or seal is included
    const authSignatoryY = (hasSignature || hasSeal) ? footerY + 70 : footerY + 60;
    doc.text("Authorized Signatory", 350, authSignatoryY, { align: "right", width: 200 });

    doc.end();
}

function drawLine(doc, y, color = "#aaaaaa") {
    doc.strokeColor(color).lineWidth(1).moveTo(40, y).lineTo(555, y).stroke();
}

function numberToRupeesWords(amount) {
    const num = Math.round(amount);
    if (num === 0) return "Rupees Zero Only";

    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function numToWords(n) {
        if (n < 20) return a[n];
        const digit = n % 10;
        if (digit === 0) return b[Math.floor(n / 10)];
        return b[Math.floor(n / 10)] + " " + a[digit];
    }

    function convertLessThanThousand(n) {
        let word = "";
        if (n >= 100) {
            word += a[Math.floor(n / 100)] + " Hundred";
            n %= 100;
            if (n > 0) word += " and ";
        }
        if (n > 0) {
            word += numToWords(n);
        }
        return word;
    }

    let remaining = num;
    let words = "";

    if (remaining >= 10000000) {
        const crores = Math.floor(remaining / 10000000);
        words += convertLessThanThousand(crores) + " Crore ";
        remaining %= 10000000;
    }

    if (remaining >= 100000) {
        const lakhs = Math.floor(remaining / 100000);
        words += convertLessThanThousand(lakhs) + " Lakh ";
        remaining %= 100000;
    }

    if (remaining >= 1000) {
        const thousands = Math.floor(remaining / 1000);
        words += convertLessThanThousand(thousands) + " Thousand ";
        remaining %= 1000;
    }

    if (remaining > 0) {
        words += convertLessThanThousand(remaining);
    }

    return "Rupees " + words.trim().replace(/\s+/g, ' ') + " Only";
}

function drawPageHeader(doc, po, theme) {
    const y = 40;
    // Draw compact top header
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#1E3A8A").text(company.name, 40, y, { width: 250 });
    doc.fontSize(8).font("Helvetica").fillColor(theme.secondaryText).text(`GSTIN: ${company.gstin}`, 40, y + 15);
    
    doc.fontSize(10).font("Helvetica-Bold").fillColor(theme.primary).text("PURCHASE ORDER", 400, y, { align: "right" });
    doc.fontSize(8).font("Helvetica").fillColor(theme.secondaryText);
    doc.text(`PO No: ${po.poNumber}`, 400, y + 13, { align: "right" });
    doc.text(`Date: ${new Date(po.date).toLocaleDateString("en-IN")}`, 400, y + 23, { align: "right" });
    
    // Draw horizontal line separator
    drawLine(doc, y + 35, theme.accent);
}

module.exports = { generatePoPDF };
