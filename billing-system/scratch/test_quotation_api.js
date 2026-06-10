const http = require("http");

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("Starting quotation API end-to-end tests...");

  // Test 1: POST /api/quotations - Missing quoteNumber (expect 404)
  try {
    const res1 = await request(
      {
        host: "localhost",
        port: 5000,
        path: "/api/quotations",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      {
        customerId: null,
        customerName: "Manual Test Customer",
        customerGSTIN: "29AAAAA1111A1Z1",
        customerAddress: "Bangalore, Karnataka",
        customerState: "Karnataka",
        customerPhone: "9876543210",
        items: [
          {
            productId: null,
            productCode: "MANUAL-ITEM-1",
            name: "Test Manual Item 1",
            hsn: "8424",
            unit: "Nos",
            qty: 2,
            rate: 250.5,
            gstRate: 18,
          },
        ],
        discountPercent: 10,
      }
    );

    console.log(`Test 1 (Missing Quote Number): HTTP ${res1.statusCode}`);
    const data1 = JSON.parse(res1.data);
    if (res1.statusCode === 404 && data1.error === "Quotation number is mandatory") {
      console.log("✅ Test 1 Passed: Returned 404 and correct error message.");
    } else {
      console.error("❌ Test 1 Failed:", res1.statusCode, data1);
    }
  } catch (err) {
    console.error("❌ Test 1 Error:", err);
  }

  // Test 2: POST /api/quotations - Valid submission with raw quoteNumber (expect 200 & formatted prefix)
  let savedQuoteId = null;
  let quoteNumberToTest = "55-" + Math.floor(Math.random() * 10000); // Random suffix to avoid uniqueness conflict
  try {
    const res2 = await request(
      {
        host: "localhost",
        port: 5000,
        path: "/api/quotations",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
      {
        quoteNumber: quoteNumberToTest,
        customerId: null,
        customerName: "Manual Test Customer",
        customerGSTIN: "29AAAAA1111A1Z1",
        customerAddress: "Bangalore, Karnataka",
        customerState: "Karnataka",
        customerPhone: "9876543210",
        items: [
          {
            productId: null,
            productCode: "MANUAL-ITEM-1",
            name: "Test Manual Item 1",
            hsn: "8424",
            unit: "Nos",
            qty: 2,
            rate: 250.5,
            gstRate: 18,
          },
        ],
        discountPercent: 10,
      }
    );

    console.log(`Test 2 (Create Quote with Manual Details): HTTP ${res2.statusCode}`);
    const data2 = JSON.parse(res2.data);
    if (res2.statusCode === 200) {
      console.log("✅ Test 2 Passed: Quotation created successfully.");
      console.log("Formatted Quote Number:", data2.quoteNumber);
      if (data2.quoteNumber.startsWith("FFI/26-27/055-") || data2.quoteNumber.startsWith("FFI/26-27/55-")) {
        console.log("✅ Quote number prefix & padding formatted successfully.");
      } else {
        console.warn("⚠️ Quote number format mismatch:", data2.quoteNumber);
      }
      savedQuoteId = data2._id;
    } else {
      console.error("❌ Test 2 Failed:", res2.statusCode, data2);
    }
  } catch (err) {
    console.error("❌ Test 2 Error:", err);
  }

  // Test 3: GET /api/quotations/:id/pdf - Verify PDF generation with manual fallbacks (expect 200 / PDF binary)
  if (savedQuoteId) {
    try {
      const res3 = await request({
        host: "localhost",
        port: 5000,
        path: `/api/quotations/${savedQuoteId}/pdf`,
        method: "GET",
      });

      console.log(`Test 3 (Generate PDF with Manual Details): HTTP ${res3.statusCode}`);
      if (res3.statusCode === 200 && res3.headers["content-type"] === "application/pdf") {
        console.log(`✅ Test 3 Passed: PDF generated successfully (${res3.data.length} bytes).`);
      } else {
        console.error("❌ Test 3 Failed:", res3.statusCode, res3.headers["content-type"], res3.data);
      }
    } catch (err) {
      console.error("❌ Test 3 Error:", err);
    }
  }
}

runTests();
