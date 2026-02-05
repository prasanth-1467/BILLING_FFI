const PDFDocument = require("pdfkit");
const company = require("../config/companyDetails");

const fs = require('fs');
const path = require('path');

function generatePoPDF(res, po) {
    const includeSignature = po?.includeSignature === true;
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

    // Stream to response
    doc.pipe(res);

    // ===========================
    // SECTION 1: DOCUMENT TITLE & COMPANY INFO
    // ===========================
    let y = 40;

    // Company Name
    doc.fontSize(18).font("Helvetica-Bold").text(company.name, { align: "center" });
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

    drawLine(doc, y);
    y += 15;

    // ===========================
    // SECTION 2: SUPPLIER + PO DETAILS
    // ===========================
    const leftColX = 40;
    const rightColX = 350;
    const colWidth = 230;
    const startSection2Y = y;

    // --- Left Block: Supplier ---
    doc.fontSize(10).font("Helvetica-Bold").text("To (Supplier):", leftColX, y);
    y += 15;

    // Calculate Supplier Block Height
    let supplierY = y;
    if (po.supplier) {
        doc.font("Helvetica-Bold").text(po.supplier.name, leftColX, supplierY, { width: colWidth });
        supplierY += doc.heightOfString(po.supplier.name, { width: colWidth }) + 2;

        doc.font("Helvetica");
        if (po.supplier.address) {
            doc.text(po.supplier.address, leftColX, supplierY, { width: colWidth });
            supplierY += doc.heightOfString(po.supplier.address, { width: colWidth }) + 2;
        }
        if (po.supplier.gstin) {
            doc.text(`GSTIN: ${po.supplier.gstin}`, leftColX, supplierY, { width: colWidth });
            supplierY += 12;
        }
        // Phone/Email if needed
        if (po.supplier.phone) {
            doc.text(`Phone: ${po.supplier.phone}`, leftColX, supplierY, { width: colWidth });
            supplierY += 12;
        }
    } else {
        doc.font("Helvetica").text("Unknown Supplier", leftColX, supplierY);
        supplierY += 12;
    }
    const section2LeftEndY = supplierY;

    // --- Right Block: PO Details ---
    let poDetailsY = startSection2Y;
    doc.fontSize(10).font("Helvetica-Bold").text("PO Details:", rightColX, poDetailsY);

    // Switch to normal font and list details using simple text flow
    doc.font("Helvetica").fontSize(10);
    // Use a small offset for the details block below the header
    let detailsY = doc.y + 5;

    // Render each line cleanly
    doc.text(`PO No: ${po.poNumber}`, rightColX, detailsY);
    doc.text(`Date: ${new Date(po.date).toLocaleDateString("en-IN")}`);

    if (po.expectedDeliveryDate) {
        doc.text(`Exp. Delivery: ${new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN")}`);
    }

    const section2RightEndY = doc.y;

    // End of Section 2
    y = Math.max(section2LeftEndY, section2RightEndY) + 15;
    drawLine(doc, y);
    y += 15;

    // ===========================
    // SECTION 3: BILL TO + SHIP TO
    // ===========================
    const startSection3Y = y;

    // --- Left Block: Bill To ---
    // Bill To is US (The Buyer) - Using Company Details
    doc.fontSize(10).font("Helvetica-Bold").text("Bill To:", leftColX, y);
    y += 15;

    let billToY = y;
    doc.font("Helvetica-Bold").text(company.name, leftColX, billToY, { width: colWidth });
    billToY += doc.heightOfString(company.name, { width: colWidth }) + 2;

    doc.font("Helvetica").text(company.address, leftColX, billToY, { width: colWidth });
    billToY += doc.heightOfString(company.address, { width: colWidth }) + 2;

    doc.text(`GSTIN: ${company.gstin}`, leftColX, billToY);
    billToY += 12;
    doc.text(`Phone: ${company.phone}`, leftColX, billToY);
    billToY += 12;
    doc.text(`Email: ${company.email}`, leftColX, billToY);
    billToY += 12;

    const section3LeftEndY = billToY;

    // --- Right Block: Ship To ---
    // Defaulting to Bill To details as requested
    let shipToY = startSection3Y;
    doc.fontSize(10).font("Helvetica-Bold").text("Ship To:", rightColX, shipToY);
    shipToY += 15;

    doc.font("Helvetica-Bold").text(company.name, rightColX, shipToY, { width: colWidth });
    shipToY += doc.heightOfString(company.name, { width: colWidth }) + 2;

    doc.font("Helvetica").text(company.address, rightColX, shipToY, { width: colWidth });
    shipToY += doc.heightOfString(company.address, { width: colWidth }) + 2;

    const section3RightEndY = shipToY;

    // End of Section 3
    y = Math.max(section3LeftEndY, section3RightEndY) + 20;

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
        doc.rect(40, currY - 5, 525, 20).fill("#f3f4f6").stroke();
        doc.fillColor("black");

        doc.fontSize(9).font("Helvetica-Bold");
        doc.text("S.No", colX.sl, currY, { width: colW.sl, align: "center" });
        doc.text("Product / Description", colX.prod, currY, { width: colW.prod });
        doc.text("Model No", colX.model, currY, { width: colW.model, align: "center" });
        doc.text("GST%", colX.gst, currY, { width: colW.gst, align: "center" });
        doc.text("Qty", colX.qty, currY, { width: colW.qty, align: "center" });
        doc.text("Unit", colX.unit, currY, { width: colW.unit, align: "center" });
        doc.text("Rate", colX.rate, currY, { width: colW.rate, align: "right" });
        doc.text("Amount", colX.amount, currY, { width: colW.amount, align: "right" });
    };

    drawHeader(y);
    y += 25;

    // Items Loop
    let subtotal = 0;
    const taxSlabs = {}; // { 18: { taxable: 0, tax: 0 } }

    doc.font("Helvetica").fontSize(9);

    po.items.forEach((item, i) => {
        const rate = Number(item.rate || 0);
        const qty = Number(item.qty || 0);
        const gstRate = Number(item.gstRate || 0); // Need to ensure schema has this now
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
        const modelNo = item.modelNo || "-";

        // Dynamic Height
        const descHeight = doc.heightOfString(productName, { width: colW.prod });
        const modelHeight = doc.heightOfString(modelNo, { width: colW.model });
        const rowHeight = Math.max(descHeight, modelHeight, 15) + 10;

        // Page Break
        if (y + rowHeight > 700) {
            doc.addPage();
            y = 40;
            drawHeader(y);
            y += 25;
            doc.font("Helvetica").fontSize(9);
        }

        doc.text(i + 1, colX.sl, y, { width: colW.sl, align: "center" });
        doc.text(productName, colX.prod, y, { width: colW.prod });
        doc.text(modelNo, colX.model, y, { width: colW.model, align: "center" });
        doc.text(`${gstRate}%`, colX.gst, y, { width: colW.gst, align: "center" });
        doc.text(qty, colX.qty, y, { width: colW.qty, align: "center" });
        doc.text(item.unit || "-", colX.unit, y, { width: colW.unit, align: "center" });
        doc.text(rate.toFixed(2), colX.rate, y, { width: colW.rate, align: "right" });
        doc.text(amount.toFixed(2), colX.amount, y, { width: colW.amount, align: "right" });

        y += rowHeight;
    });

    drawLine(doc, y);
    y += 10;

    // --- TOTALS & TAX BREAKDOWN ---
    // Assuming Intra-state (CGST/SGST) unless we detect otherwise, but for simplicty and robustness 
    // without full state address parsing validation, we will display CGST/SGST split by default for local POs.
    // Ideally we compare company.state vs supplier.state.

    // Calculate Grand Total
    let totalTax = 0;
    Object.values(taxSlabs).forEach(s => totalTax += s.tax);
    let totalAmount = subtotal + totalTax;

    // Round Off
    const roundedTotal = Math.round(totalAmount);
    const roundOff = roundedTotal - totalAmount;

    const totalsX = 350;

    // Subtotal
    doc.text(`Subtotal (Taxable):`, totalsX, y);
    doc.text(subtotal.toFixed(2), 0, y, { align: "right" });
    y += 15;

    // Render Tax Slabs
    Object.keys(taxSlabs).sort((a, b) => Number(a) - Number(b)).forEach(rateKey => {
        const slab = taxSlabs[rateKey];
        const rate = Number(rateKey);

        // Split into CGST / SGST (Assumed Intra-State for simplicity or consistent default)
        // If we want accurate state check:
        // const isInterState = company.state?.toLowerCase() !== po.supplier?.state?.toLowerCase();
        // For now, let's assume standard split as requested "LIKE INVOICE PDF" which typically splits.

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

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text(`Grand Total:`, totalsX, y);
    doc.text(`Rs. ${roundedTotal.toFixed(2)}`, 0, y, { align: "right" });
    y += 40;

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
    }

    const footerY = doc.page.height - doc.page.margins.bottom - requiredHeight;

    // Terms (Left - 60%)
    doc.fontSize(10).font("Helvetica-Bold").text("Terms & Conditions:", 40, footerY);
    doc.fontSize(9).font("Helvetica");
    let currentTermY = footerY + 15;

    terms.forEach(term => {
        doc.text(term, 40, currentTermY, { width: 300 });
        currentTermY += doc.heightOfString(term, { width: 300 }) + 3;
    });

    // Signatory (Right - 40%)
    doc.fontSize(10).font("Helvetica-Bold").text(`For ${company.name}`, 350, footerY, { align: "right", width: 200 });

    if (includeSignature) {
        const signaturePath = path.join(__dirname, '../assets/signature.png');
        if (fs.existsSync(signaturePath)) {
            try {
                doc.image(signaturePath, 450, footerY + 15, { width: 80 });
            } catch (err) {
                console.error("Error loading signature image:", err);
            }
        }
    }

    // Adjust Text Y position: Push down further if signature is included
    const authSignatoryY = includeSignature ? footerY + 70 : footerY + 60;
    doc.text("Authorized Signatory", 350, authSignatoryY, { align: "right", width: 200 });

    doc.end();
}

function drawLine(doc, y) {
    doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(40, y).lineTo(555, y).stroke();
}

module.exports = { generatePoPDF };
