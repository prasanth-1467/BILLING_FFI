/**
 * Standalone Utility Helper for E-Way Bill JSON Generation
 * Official GST NIC Bulk Upload JSON Schema (Version 1.0.04)
 */

// Mapping of cleaned Indian state names to standard 2-digit GST state codes
const STATE_CODES = {
  "jammu and kashmir": 1,
  "himachal pradesh": 2,
  "punjab": 3,
  "chandigarh": 4,
  "uttarakhand": 5,
  "haryana": 6,
  "delhi": 7,
  "rajasthan": 8,
  "uttar pradesh": 9,
  "bihar": 10,
  "sikkim": 11,
  "arunachal pradesh": 12,
  "nagaland": 13,
  "manipur": 14,
  "mizoram": 15,
  "tripura": 16,
  "meghalaya": 17,
  "assam": 18,
  "west bengal": 19,
  "jharkhand": 20,
  "odisha": 21,
  "chhattisgarh": 22,
  "madhya pradesh": 23,
  "gujarat": 24,
  "daman and diu": 26,
  "dadra and nagar haveli": 26,
  "maharashtra": 27,
  "andhra pradesh": 37,
  "karnataka": 29,
  "goa": 30,
  "lakshadweep": 31,
  "kerala": 32,
  "tamil nadu": 33,
  "puducherry": 34,
  "andaman and nicobar islands": 35,
  "telangana": 36,
  "ladakh": 38
};

/**
 * Gets the 2-digit GST State Code from a state name or GSTIN.
 * @param {string} stateName - The name of the state.
 * @param {string} gstin - The GSTIN string.
 * @returns {number} The 2-digit state code.
 */
export function getStateCode(stateName, gstin) {
  // Extract state code from GSTIN if valid (first 2 characters are digits)
  if (gstin && gstin.length >= 2) {
    const prefix = gstin.substring(0, 2);
    if (/^\d+$/.test(prefix)) {
      return parseInt(prefix, 10);
    }
  }

  if (!stateName) return 33; // Default to Tamil Nadu

  const key = stateName.toLowerCase().trim().replace(/\s+/g, ' ');
  return STATE_CODES[key] || 33; // Fallback to Tamil Nadu
}

/**
 * Formats a date string or object to DD/MM/YYYY.
 * @param {string|Date} dateInput - The date input.
 * @returns {string} Formatted date string.
 */
function formatDate(dateInput) {
  if (!dateInput) return "";
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) return "";

  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Clean text helper to eliminate non-breaking space characters (\u00a0) and non-ASCII characters
const cleanText = (str) => 
  (str || "").toString().replace(/\u00a0/g, ' ').replace(/[^\x20-\x7E]/g, '').trim();

/**
 * Cleans and sanitizes product name strings to satisfy GST portal rules:
 * - Replaces inch quotes (") with 'inch'
 * - Removes brackets [ ] and caret ^
 * - Truncates to max 95 characters
 * @param {string} name - The product name to clean.
 * @returns {string} Sanitized product name.
 */
function sanitizeProductName(name) {
  if (!name) return "Product";
  let cleaned = cleanText(name);
  cleaned = cleaned.replace(/"/g, 'inch');
  cleaned = cleaned.replace(/[\[\]\^]/g, '');
  return cleaned.substring(0, 95);
}

/**
 * Transforms an invoice object and supplementary inputs into the official NIC E-Way Bill JSON schema.
 * @param {Object} invoiceData - The invoice and transport details object.
 * @returns {Object} NIC compliant E-Way Bill JSON object.
 */
export function generateEWayBillJSON(invoiceData) {
  if (!invoiceData) {
    throw new Error("E-Way Bill generation failed: Invoice data is empty.");
  }

  // 1. Resolve State Codes to check Intra/Inter state status
  const fromStateCode = getStateCode("Tamil Nadu", "33BOZPM0559L1Z8");

  const customerState = invoiceData.customerState || invoiceData.customerId?.state || "";
  let toGstin = invoiceData.customerGSTIN || invoiceData.customerId?.gstNumber || "URP";
  toGstin = toGstin.trim().toUpperCase();
  if (toGstin === "URD" || toGstin === "") {
    toGstin = "URP";
  }

  const toStateCode = getStateCode(customerState, toGstin);
  const isIntraState = fromStateCode === toStateCode;

  // 2. Validate mandatory transport details (transDistance is defaulted to 0 for auto-calculation)
  const vehicleNo = (invoiceData.vehicleNo || "").trim().toUpperCase();
  if (!vehicleNo) {
    throw new Error("E-Way Bill generation failed: Vehicle number ('vehicleNo') is required.");
  }

  const toPincode = parseInt(invoiceData.toPincode, 10);
  if (isNaN(toPincode) || String(toPincode).length !== 6) {
    throw new Error("E-Way Bill generation failed: Delivery pincode ('toPincode') is required and must be a 6-digit number.");
  }

  // 3. Process items list and compute precise taxable amount and GST values per item
  const discountPercent = Number(invoiceData.discountPercent || 0);

  const itemList = (invoiceData.items || []).map((item, index) => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const itemAmount = qty * rate;
    const taxableAmount = parseFloat((itemAmount * (1 - discountPercent / 100)).toFixed(2));

    const gstRate = Number(item.gstRate || 0);
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;

    if (isIntraState) {
      cgstRate = gstRate / 2;
      sgstRate = gstRate / 2;
    } else {
      igstRate = gstRate;
    }

    const hsnRaw = item.hsn || (item.productId && item.productId.hsn) || "8424";
    const hsnCleaned = String(hsnRaw).replace(/\D/g, "");
    const hsnCode = hsnCleaned ? parseInt(hsnCleaned, 10) : 8424;
    const prodName = item.name || (item.productId && item.productId.name) || `Product ${index + 1}`;
    const sanitizedProdName = sanitizeProductName(prodName);

    return {
      itemNo: index + 1,
      productName: sanitizedProdName,
      productDesc: sanitizedProdName,
      hsnCode: Number(hsnCode),
      quantity: Number(qty),
      qtyUnit: cleanText(item.unit || (item.productId && item.productId.unit) || "NOS").toUpperCase(),
      cgstRate: Number(cgstRate.toFixed(2)),
      sgstRate: Number(sgstRate.toFixed(2)),
      igstRate: Number(igstRate.toFixed(2)),
      cessRate: 0,
      taxableAmount: Number(taxableAmount)
    };
  });

  if (itemList.length === 0) {
    throw new Error("E-Way Bill generation failed: Invoice has no items.");
  }

  // 4. Calculate total values
  const totValue = parseFloat(itemList.reduce((sum, item) => sum + item.taxableAmount, 0).toFixed(2));

  let cgstValue = 0;
  let sgstValue = 0;
  let igstValue = 0;

  itemList.forEach((item) => {
    if (isIntraState) {
      cgstValue += (item.taxableAmount * item.cgstRate) / 100;
      sgstValue += (item.taxableAmount * item.sgstRate) / 100;
    } else {
      igstValue += (item.taxableAmount * item.igstRate) / 100;
    }
  });

  cgstValue = parseFloat(cgstValue.toFixed(2));
  sgstValue = parseFloat(sgstValue.toFixed(2));
  igstValue = parseFloat(igstValue.toFixed(2));

  // NIC schema total invoice value includes taxes and roundings
  const totInvValue = Math.round(totValue + cgstValue + sgstValue + igstValue);

  // 5. Dynamic validation check: threshold check
  if (isIntraState) {
    if (totInvValue < 100000) {
      const errMsg = `Intra-state invoice total (₹${totInvValue}) is less than the mandatory threshold of ₹100,000.`;
      console.warn(`[E-Way Bill Warning]: ${errMsg}`);
      throw new Error(errMsg);
    }
  } else {
    if (totInvValue < 50000) {
      const errMsg = `Inter-state invoice total (₹${totInvValue}) is less than the mandatory threshold of ₹50,000.`;
      console.warn(`[E-Way Bill Warning]: ${errMsg}`);
      throw new Error(errMsg);
    }
  }

  // 6. Build official JSON payload conforming to GST Portal Bulk Upload Array Schema
  return {
    version: "1.0.0621",
    billLists: [
      {
        userGstin: "33BOZPM0559L1Z8",
        supplyType: "O",
        subSupplyType: 1,
        docType: "INV",
        docNo: cleanText(invoiceData.invoiceNumber || "INV-TEMP"),
        docDate: formatDate(invoiceData.date || new Date()),
        transType: 1,
        fromGstin: "33BOZPM0559L1Z8",
        fromTrdName: "FINE FLOW IRRIGATION",
        fromAddr1: "SF.No 49/1C,50/2, Kullichettipalayam",
        fromAddr2: "",
        fromPlace: "Pollachi",
        fromPincode: 642110,
        actualFromStateCode: 33,
        fromStateCode: 33,
        toGstin: cleanText(toGstin),
        toTrdName: cleanText(invoiceData.customerName || "Customer"),
        toAddr1: cleanText(invoiceData.customerAddress || "Address"),
        toAddr2: "",
        toPlace: cleanText(invoiceData.toPlace || customerState || "City"),
        toPincode: Number(toPincode),
        actualToStateCode: Number(toStateCode || 33),
        toStateCode: Number(toStateCode || 33),
        mainHsnCode: Number(itemList.length > 0 ? itemList[0].hsnCode : 8424),
        totalValue: Number(totValue),
        cgstValue: Number(cgstValue),
        sgstValue: Number(sgstValue),
        igstValue: Number(igstValue),
        cessValue: 0,
        TotNonAdvolVal: 0,
        OthValue: 0,
        totInvValue: Number(totInvValue),
        transMode: 1,
        transDistance: 0,
        transporterId: "",
        transporterName: "",
        transDocNo: "",
        transDocDate: "",
        vehicleNo: cleanText(vehicleNo),
        vehicleType: invoiceData.vehicleType || "R",
        itemList
      }
    ]
  };
}

/**
 * Generates E-Way Bill JSON and triggers browser file download.
 * @param {Object} invoiceData - The invoice and transport details object.
 */
export function downloadEWayBillJSON(invoiceData) {
  try {
    const ewayBillJson = generateEWayBillJSON(invoiceData);
    const jsonString = JSON.stringify(ewayBillJson, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    const docNo = invoiceData.invoiceNumber || "TEMP";
    // Strip all non-alphanumeric characters, including underscores
    const filenameSafeNumber = docNo.replace(/[^a-zA-Z0-9]/g, "");
    const downloadFileName = `ewaybill${filenameSafeNumber}.json`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`[E-Way Bill]: Successfully downloaded ${downloadFileName}`);
  } catch (error) {
    console.error("[E-Way Bill Download Error]:", error.message);
    throw error;
  }
}
