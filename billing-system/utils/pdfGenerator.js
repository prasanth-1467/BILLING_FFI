const PDFDocument = require("pdfkit");
const company = require("../config/companyDetails");

const fs = require('fs');
const path = require('path');

function generatePDF(res, data, type = "TAX INVOICE", includeSignature = false) {
    const doc = new PDFDocument({ size: "A4", margin: 40 });

    // Pipe to response
    doc.pipe(res);

    // --- FALLBACK FOR OLD DATA (Missing Round Off) ---
    // If roundOff is missing/zero but total has decimals, apply rounding on the fly.
    const currentTotal = Number(data.total);
    const roundedCalc = Math.round(currentTotal);
    const diff = roundedCalc - currentTotal;

    // Tolerance for float comparison
    if (Math.abs(diff) > 0.01) {
        if (!data.roundOff || Math.abs(data.roundOff) < 0.01) {
            data.roundOff = diff;
            data.total = roundedCalc;
        }
    }

    // --- HEADER SECTION (3 Columns) ---
    const headersY = 40;

    // 1. Company Details (Left - x:40)
    doc.fontSize(16).text(company.name, 40, headersY, { width: 250 }); // Reduced font size to fit 3 cols if long name
    const companyAddressY = doc.y; // Capture Y where address starts
    doc.fontSize(9).text(company.address, { width: 200 }); // Constrain width
    doc.text(`Mobile: ${company.phone}`);
    doc.text(`Email: ${company.email}`);
    doc.text(`GSTIN: ${company.gstin}`);
    const companyEndY = doc.y;

    // 2. Bank Details (Center - x:245) - Compact & Aligned
    let bankEndY = companyAddressY;
    if (company.bankDetails) {
        doc.fontSize(9).font("Helvetica-Bold").text("Bank Details:", 245, companyAddressY); // Main Header

        const labelX = 245;
        const valueX = 300; // Shifted left to give values more room
        const startY = doc.y + 3; // Small gap

        // Update font for list items (Regular font to look "smaller")
        doc.fontSize(9).font("Helvetica");

        // Helper to draw row without wrapping
        const drawBankRow = (label, value) => {
            const currentY = doc.y;
            // Draw Label
            doc.text(label, labelX, currentY, { width: 55, align: "left" });
            // Draw Value on same line
            doc.text(`: ${value}`, valueX, currentY, { width: 140, align: "left" });
        };

        // Bank Name
        doc.text("", labelX, startY); // Reset Y to start
        drawBankRow("Bank Name", company.bankDetails.bankName);

        // Account Name
        drawBankRow("Acc Name", company.bankDetails.accountName);

        // Account Number
        drawBankRow("Acc No", company.bankDetails.accountNo);

        // IFSC
        drawBankRow("IFSC Code", company.bankDetails.ifsc);

        // Branch
        if (company.bankDetails.branch) {
            drawBankRow("Branch", company.bankDetails.branch);
        }
        bankEndY = doc.y;
    }

    // 3. Invoice Metadata (Right - x:400) - Align Right
    doc.fontSize(14).font("Helvetica").text(type, 400, headersY, { align: "right" });
    doc.fontSize(10).text(`No: ${data.number}`, { align: "right" });
    doc.text(`Date: ${new Date(data.date).toLocaleDateString("en-IN")}`, { align: "right" });
    if (data.paymentTerms) {
        doc.text(`Terms: ${data.paymentTerms}`, { align: "right" });
    }
    const invoiceEndY = doc.y;

    // Vertical Separator Line {Computed dynamically}
    const lineX = 235;
    const lineStartY = companyAddressY;
    const lineEndY = Math.max(companyEndY, bankEndY);
    doc.lineWidth(0.5).moveTo(lineX, lineStartY).lineTo(lineX, lineEndY).stroke();

    // Determine max height for line
    const finalHeaderY = Math.max(companyEndY, bankEndY, invoiceEndY) + 15;

    drawLine(doc, finalHeaderY);

    // --- ADDRESS SECTION (Dynamic Height) ---
    const addressY = finalHeaderY + 10; // Dynamic start Y
    const colWidth = 230;

    // Bill To (Left)
    doc.fontSize(10).font("Helvetica-Bold").text("Bill To:", 40, addressY);
    doc.font("Helvetica-Bold").text(data.customer.name, 40, doc.y, { width: colWidth });
    doc.font("Helvetica").text(data.customer.address, { width: colWidth });
    if (data.customer.state) doc.text(data.customer.state); // Add State
    if (data.customer.gst) doc.text(`GSTIN: ${data.customer.gst}`);
    const billToEndY = doc.y;

    let shipToEndY = addressY; // Default if no ship to

    // Ship To (Right)
    if (data.customer.shipTo) {
        doc.fontSize(10).font("Helvetica-Bold").text("Ship To:", 300, addressY);
        doc.font("Helvetica-Bold").text(data.customer.shipTo.name || data.customer.name, 300, doc.y, { width: colWidth });
        doc.font("Helvetica").text(data.customer.shipTo.address || data.customer.address, { width: colWidth });
        const cityState = [data.customer.shipTo.city, data.customer.shipTo.state].filter(Boolean).join(", ");
        if (cityState) doc.text(cityState, { width: colWidth });
        if (data.customer.shipTo.phone) doc.text(`Phone: ${data.customer.shipTo.phone}`);
        shipToEndY = doc.y;
    }

    // Determine separator line position based on max height
    const sectionEndY = Math.max(billToEndY, shipToEndY) + 10;
    drawLine(doc, sectionEndY);

    // --- ITEMS TABLE ---
    let y = sectionEndY + 20; // Start table below address section

    // Table Header
    drawTableRow(doc, y, "Sl", "Description", "HSN", "GST %", "Qty", "Unit", "Rate", "Amount", true);
    drawLine(doc, y + 20);
    y += 30;

    // Items
    data.items.forEach((item, i) => {
        // Dynamic Height Calculation
        const descWidth = 150;
        const descHeight = doc.heightOfString(item.name, { width: descWidth });
        const rowHeight = Math.max(descHeight, 20); // Minimum height 20
        const padding = 10;
        const totalRowHeight = rowHeight + padding;

        // Page break check (Reduced to 600 to leave space for Bank & Footer)
        if (y + totalRowHeight > 600) {
            doc.addPage();
            y = 40;
            // Redraw Header
            drawTableRow(doc, y, "Sl", "Description", "HSN", "GST %", "Qty", "Unit", "Rate", "Amount", true);
            drawLine(doc, y + 20);
            y += 30;
        }

        drawTableRow(
            doc,
            y,
            i + 1,
            item.name,
            item.hsn || "-",
            item.gstRate ? `${item.gstRate}%` : "-",
            item.qty,
            item.unit,
            Number(item.rate).toFixed(2),
            Number(item.amount).toFixed(2)
        );

        y += totalRowHeight;
    });

    drawLine(doc, y);
    y += 10;

    // --- TOTALS SECTION ---
    const totalsX = 350;
    doc.text(`Subtotal:`, totalsX, y);
    doc.text(Number(data.subtotal).toFixed(2), 0, y, { align: "right" });
    y += 15;

    // Discount - Only show if > 0
    if (data.discountPercent > 0) {
        doc.text(`Discount (${data.discountPercent}%):`, totalsX, y);
        doc.text(Number(data.discount).toFixed(2), 0, y, { align: "right" });
        y += 15;
    }

    doc.text(`Taxable Amount:`, totalsX, y);
    doc.text(Number(data.taxableAmount).toFixed(2), 0, y, { align: "right" });
    y += 15;

    // GST Breakup Display
    // Aggregate Tax by Rate Slab
    const taxSlabs = {}; // { rate: { taxable: 0, tax: 0 } }

    data.items.forEach(item => {
        const rate = Number(item.gstRate || 0);
        if (rate > 0) {
            if (!taxSlabs[rate]) taxSlabs[rate] = { taxable: 0, tax: 0 };

            // Calculate Item Taxable Amount (Apply Invoice Discount)
            const itemAmount = Number(item.amount);
            const itemTaxable = itemAmount - (itemAmount * (data.discountPercent || 0) / 100);
            const taxAmount = (itemTaxable * rate) / 100;

            taxSlabs[rate].taxable += itemTaxable;
            taxSlabs[rate].tax += taxAmount;
        }
    });

    const isInterState = data.gst.IGST > 0;

    // Render Slabs Sorted by Rate
    Object.keys(taxSlabs)
        .sort((a, b) => Number(a) - Number(b))
        .forEach(rateKey => {
            const rate = Number(rateKey);
            const slab = taxSlabs[rateKey];
            const taxVal = slab.tax; // Total Tax for this slab

            if (isInterState) {
                // IGST
                doc.text(`IGST @ ${rate}% :`, totalsX, y);
                doc.text(Number(taxVal).toFixed(2), 0, y, { align: "right" });
                y += 15;
            } else {
                // Intra-State (Split into CGST/SGST)
                const halfRate = rate / 2;
                const halfTax = taxVal / 2;

                doc.text(`CGST @ ${halfRate}% :`, totalsX, y);
                doc.text(Number(halfTax).toFixed(2), 0, y, { align: "right" });
                y += 15;

                doc.text(`SGST @ ${halfRate}% :`, totalsX, y);
                doc.text(Number(halfTax).toFixed(2), 0, y, { align: "right" });
                y += 15;
            }
        });



    y += 5;

    // Round Off
    if (data.roundOff && Math.abs(data.roundOff) > 0) {
        doc.text(`Round Off (R/O):`, totalsX, y);
        const sign = data.roundOff > 0 ? "+" : "";
        doc.text(`${sign}${Number(data.roundOff).toFixed(2)}`, 0, y, { align: "right" });
        y += 15;
    }

    drawLine(doc, y);
    y += 10;

    doc.font("Helvetica-Bold").text(`Total Payable:`, totalsX, y);
    doc.text(`Rs. ${Number(data.total).toFixed(2)}`, 0, y, { align: "right" });

    // --- TERMS & FOOTER ---
    const footerStart = 610;

    // Check if we need a new page for footer
    if (y > footerStart - 20) {
        doc.addPage();
    }


    // Terms & Conditions (Below Bank Details)
    const termsY = 700;
    doc.font("Helvetica").fontSize(10);
    doc.text("Terms & Conditions:", 40, termsY);
    doc.fontSize(8).text("1. Goods once sold will not be taken back.");
    doc.text("2. 100% payment in advance.");
    doc.text("3. Materials will be supplied within 20 days from the date of receipt of payment.");
    doc.text("4. Transportation and installation shall be arranged by the customer.");
    doc.text("5. Subject to local jurisdiction.");

    // Signatory (Right Aligned - same Y as Terms)
    doc.fontSize(10).text(`For ${company.name}`, 350, termsY, { align: "right" });

    if (includeSignature) {
        const signaturePath = path.join(__dirname, '../assets/signature.png');
        if (fs.existsSync(signaturePath)) {
            try {
                // Place signature image
                doc.image(signaturePath, 450, termsY + 15, { width: 80 });
            } catch (err) {
                console.error("Error loading signature image:", err);
            }
        }
        // Increase spacing if signature is present to avoid overlap
        doc.moveDown(6);
    } else {
        doc.moveDown(3);
    }

    doc.text("Authorized Signatory", 350, doc.y, { align: "right" });

    doc.end();
}

// Helper: Draw Line
function drawLine(doc, y) {
    doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(40, y).lineTo(550, y).stroke();
}

// Helper: Draw Table Row
function drawTableRow(doc, y, sl, desc, hsn, gst, qty, unit, rate, amount, isHeader = false) {
    const font = isHeader ? "Helvetica-Bold" : "Helvetica";
    doc.font(font).fontSize(10);

    doc.text(sl, 40, y, { width: 30, align: "center" });
    doc.text(desc, 70, y, { width: 150 }); // Reduced width for Desc
    doc.text(hsn, 220, y, { width: 50, align: "center" }); // HSN
    doc.text(gst, 270, y, { width: 40, align: "center" }); // GST %
    doc.text(qty, 310, y, { width: 40, align: "right" });
    doc.text(unit, 350, y, { width: 40, align: "center" });
    doc.text(rate, 400, y, { width: 70, align: "right" });
    doc.text(amount, 470, y, { width: 80, align: "right" });
}

module.exports = { generatePDF };
