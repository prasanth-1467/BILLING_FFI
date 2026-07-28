const PDFDocument = require("pdfkit");
const company = require("../config/companyDetails");

const fs = require('fs');
const path = require('path');

function generatePDF(resOrData, dataOrNone, type = "TAX INVOICE") {
    let res, data;
    let isBufferMode = false;

    // Check if first arg is a response-like object (has .pipe)
    if (resOrData && typeof resOrData.pipe === 'function') {
        res = resOrData;
        data = dataOrNone;
    } else {
        isBufferMode = true;
        data = resOrData;
        type = dataOrNone || "TAX INVOICE";
    }

    const includeSignature = data?.includeSignature === true;
    const includeSeal = data?.includeSeal === true;
    const theme = data?.theme || require("../config/themeConfig").indigo;
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.fillColor(theme.primary);

    let buffers = [];
    if (isBufferMode) {
        doc.on('data', chunk => buffers.push(chunk));
    } else {
        doc.pipe(res);
    }

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
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#00268D").text(company.name, 40, headersY, { width: 250 });
    doc.font("Helvetica").fillColor(theme.primary); // Restore font and color
    const companyAddressY = doc.y + 6; // Capture Y where address starts with a clean gap
    doc.fontSize(9).text(company.address, 40, companyAddressY, { width: 185, lineGap: 1.5 });
    doc.text(`Mobile: ${company.phone}`, { width: 185 });
    doc.text(`Email: ${company.email}`, { width: 185 });
    doc.text(`GSTIN: ${company.gstin}`, { width: 185 });
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
    if (data.ewayBillNo) {
        doc.text(`E-Way Bill No: ${data.ewayBillNo}`, { align: "right" });
    }
    const invoiceEndY = doc.y;

    // Vertical Separator Line {Computed dynamically}
    const lineX = 235;
    const lineStartY = companyAddressY;
    const lineEndY = Math.max(companyEndY, bankEndY);
    doc.lineWidth(0.5).strokeColor(theme.accent).moveTo(lineX, lineStartY).lineTo(lineX, lineEndY).stroke();

    // Determine max height for line
    const finalHeaderY = Math.max(companyEndY, bankEndY, invoiceEndY) + 15;

    drawLine(doc, finalHeaderY, theme.accent);

    // --- ADDRESS SECTION (Dynamic Height with themed cards) ---
    const addressY = finalHeaderY + 10; // Dynamic start Y
    const colWidth = 230;

    // Calculate dimensions first for the premium container
    const billToHeight = 15
        + doc.heightOfString(data.customer.name || "-", { width: colWidth })
        + doc.heightOfString(data.customer.address || "-", { width: colWidth })
        + (data.customer.state ? 12 : 0)
        + (data.customer.gst ? 12 : 0)
        + (data.customer.phone ? 12 : 0)
        + 10;

    let shipToHeight = 0;
    if (data.customer.shipTo) {
        shipToHeight = 15
            + doc.heightOfString(data.customer.shipTo.name || data.customer.name || "-", { width: colWidth })
            + doc.heightOfString(data.customer.shipTo.address || data.customer.address || "-", { width: colWidth })
            + 12
            + (data.customer.shipTo.phone ? 12 : 0)
            + 10;
    }
    const blockHeight = Math.max(billToHeight, shipToHeight) + 10;

    // Draw cards first
    doc.roundedRect(38, addressY - 5, 235, blockHeight, 6).fill(theme.tableHeaderBg);
    if (data.customer.shipTo) {
        doc.roundedRect(298, addressY - 5, 235, blockHeight, 6).fill(theme.tableHeaderBg);
    }

    // Now overlay the text on top
    // Bill To (Left)
    doc.fillColor(theme.primary).fontSize(10).font("Helvetica-Bold").text("Bill To:", 45, addressY);
    doc.font("Helvetica-Bold").text(data.customer.name, 45, doc.y, { width: colWidth - 10 });
    doc.font("Helvetica").fillColor(theme.secondaryText).text(data.customer.address, { width: colWidth - 10 });
    if (data.customer.state) doc.text(data.customer.state, { width: colWidth - 10 });
    if (data.customer.gst) doc.text(`GSTIN: ${data.customer.gst}`, { width: colWidth - 10 });
    if (data.customer.phone) doc.text(`Phone: ${data.customer.phone}`, { width: colWidth - 10 });
    const billToEndY = doc.y;

    let shipToEndY = addressY; // Default if no ship to

    // Ship To (Right)
    if (data.customer.shipTo) {
        doc.fillColor(theme.primary).fontSize(10).font("Helvetica-Bold").text("Ship To:", 305, addressY);
        doc.font("Helvetica-Bold").text(data.customer.shipTo.name || data.customer.name, 305, doc.y, { width: colWidth - 10 });
        doc.font("Helvetica").fillColor(theme.secondaryText).text(data.customer.shipTo.address || data.customer.address, { width: colWidth - 10 });
        const cityState = [data.customer.shipTo.city, data.customer.shipTo.state].filter(Boolean).join(", ");
        if (cityState) doc.text(cityState, { width: colWidth - 10 });
        if (data.customer.shipTo.phone) doc.text(`Phone: ${data.customer.shipTo.phone}`, { width: colWidth - 10 });
        shipToEndY = doc.y;
    }

    // Reset default text color to primary theme color
    doc.fillColor(theme.primary);

    // Determine separator line position based on max height of text/cards
    const sectionEndY = addressY + blockHeight + 10;
    drawLine(doc, sectionEndY, theme.accent);

    // --- ITEMS TABLE ---
    let y = sectionEndY + 20; // Start table below address section

    // Table Header
    doc.rect(40, y - 5, 510, 20).fill(theme.tableHeaderBg);
    doc.fillColor(theme.tableHeaderText);
    drawTableRow(doc, y, "Sl", "Description", "HSN", "GST %", "Qty", "Unit", "Rate", "Amount", true);
    doc.fillColor(theme.primary);
    drawLine(doc, y + 20, theme.accent);
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
            drawPageHeader(doc, type, data, theme);
            y = 85;
            // Redraw Header
            doc.rect(40, y - 5, 510, 20).fill(theme.tableHeaderBg);
            doc.fillColor(theme.tableHeaderText);
            drawTableRow(doc, y, "Sl", "Description", "HSN", "GST %", "Qty", "Unit", "Rate", "Amount", true);
            doc.fillColor(theme.primary);
            drawLine(doc, y + 20, theme.accent);
            y += 30;
        }

        drawTableRow(
            doc,
            y,
            i + 1,
            item.name,
            item.hsn || "-",
            (item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== "") ? `${item.gstRate}%` : "-",
            item.qty,
            item.unit,
            Number(item.rate).toFixed(2),
            Number(item.amount).toFixed(2)
        );

        y += totalRowHeight;
    });

    drawLine(doc, y, theme.accent);
    y += 10;

    // --- TOTALS SECTION ---
    const totalsX = 350;
    doc.fillColor(theme.secondaryText);
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

    drawLine(doc, y, theme.accent);
    y += 10;

    doc.fillColor(theme.primary).font("Helvetica-Bold").text(`Total Payable:`, totalsX, y);
    doc.text(`Rs. ${Number(data.total).toFixed(2)}`, 0, y, { align: "right" });

    drawLine(doc, y + 15, theme.accent);
    y += 25;
    const wordsRepresentation = numberToRupeesWords(data.total);
    doc.fillColor(theme.secondaryText).font("Helvetica-Oblique").fontSize(9).text(`Amount in Words: ${wordsRepresentation}`, 40, y);
    y += 15;

    // --- TERMS & FOOTER ---
    const footerStart = 610;

    // Check if we need a new page for footer
    if (y > footerStart - 20) {
        doc.addPage();
        drawPageHeader(doc, type, data, theme);
    }

    // Terms & Conditions (Below Bank Details)
    const termsY = 700;
    doc.fillColor(theme.primary).font("Helvetica-Bold").fontSize(10);
    doc.text("Terms & Conditions:", 40, termsY);
    doc.fillColor(theme.secondaryText).font("Helvetica").fontSize(8);
    doc.text("1. Goods once sold will not be taken back.");
    doc.text("2. 100% payment in advance.");
    doc.text("3. Materials will be supplied within 20 days from the date of receipt of payment.");
    doc.text("4. Transportation and installation shall be arranged by the customer.");
    doc.text("5. Subject to local jurisdiction.");

    // Signatory (Right Aligned - same Y as Terms)
    doc.fillColor(theme.primary).font("Helvetica-Bold").fontSize(10).text(`For ${company.name}`, 350, termsY, { align: "right" });

    const signaturePath = path.join(__dirname, '../assets/Signature.png');
    const sealPathDefault = path.join(__dirname, '../assets/Seal.png');
    const sealPathFFI = path.join(__dirname, '../assets/Seal_FFI.png');
    const sealPath = fs.existsSync(sealPathFFI) ? sealPathFFI : sealPathDefault;

    const hasSignature = includeSignature && fs.existsSync(signaturePath);
    const hasSeal = includeSeal && fs.existsSync(sealPath);

    if (hasSeal) {
        try {
            // Place seal image (positioned to the left of the signature)
            doc.image(sealPath, 340, termsY + 10, { width: 75 });
        } catch (err) {
            console.error("Error loading seal image:", err);
        }
    }

    if (hasSignature) {
        try {
            // Place signature image
            doc.image(signaturePath, 450, termsY + 15, { width: 80 });
        } catch (err) {
            console.error("Error loading signature image:", err);
        }
    }

    if (hasSignature || hasSeal) {
        doc.moveDown(6);
    } else {
        doc.moveDown(3);
    }

    doc.text("Authorized Signatory", 350, doc.y, { align: "right" });

    if (isBufferMode) {
        const pdfPromise = new Promise((resolve, reject) => {
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);
        });
        doc.end();
        return pdfPromise;
    } else {
        doc.end();
    }
}

// Helper: Draw Line
function drawLine(doc, y, color = "#aaaaaa") {
    doc.strokeColor(color).lineWidth(1).moveTo(40, y).lineTo(550, y).stroke();
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

function drawPageHeader(doc, type, data, theme) {
    const y = 40;
    // Draw compact top header
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#00268D").text(company.name, 40, y, { width: 250 });
    doc.fontSize(8).font("Helvetica").fillColor(theme.secondaryText).text(`GSTIN: ${company.gstin}`, 40, y + 15);
    
    doc.fontSize(10).font("Helvetica-Bold").fillColor(theme.primary).text(type, 400, y, { align: "right" });
    doc.fontSize(8).font("Helvetica").fillColor(theme.secondaryText);
    doc.text(`No: ${data.number}`, 400, y + 13, { align: "right" });
    doc.text(`Date: ${new Date(data.date).toLocaleDateString("en-IN")}`, 400, y + 23, { align: "right" });
    
    // Draw horizontal line separator
    drawLine(doc, y + 35, theme.accent);
}

module.exports = { generatePDF };
