const { Resend } = require("resend");
const nodemailer = require("nodemailer");

/**
 * Initialize Resend client if API key is provided in environment.
 */
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
};

/**
 * Validate standard email format using RFC-compliant pattern
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Core email sender with attachment support
 * Prioritizes official Resend Node SDK, falling back to Nodemailer SMTP if RESEND_API_KEY is unset.
 */
const sendEmailWithAttachment = async ({ to, subject, text, html, filename, content }) => {
  if (!to || !isValidEmail(to)) {
    throw new Error(`Invalid recipient email address: "${to || ""}"`);
  }

  const resend = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "onboarding@resend.dev";
  const fromHeader = `Fine Flow Irrigation <${fromEmail}>`;

  // --- METHOD 1: OFFICIAL RESEND SDK ---
  if (resend) {
    console.log(`[EmailService] Sending email to: ${to} using Official Resend SDK`);

    // Resend SDK accepts Buffer or string in content
    const attachmentContent = Buffer.isBuffer(content) ? content : Buffer.from(content);

    try {
      const { data, error } = await resend.emails.send({
        from: fromHeader,
        to: [to.trim()],
        subject: subject || "Document from Fine Flow Irrigation",
        text: text || "",
        html: html || undefined,
        attachments: [
          {
            filename: filename || "document.pdf",
            content: attachmentContent,
          },
        ],
      });

      if (error) {
        console.error("[EmailService] Resend SDK Error:", error);
        const errMessage = error.message || "Resend failed to send email";
        throw new Error(`Resend Error: ${errMessage}`);
      }

      console.log(`[EmailService] Email sent successfully via Resend SDK. Message ID: ${data?.id}`);
      return { success: true, messageId: data?.id, provider: "resend" };
    } catch (err) {
      console.error("[EmailService] Exception during Resend send:", err);
      throw err;
    }
  }

  // --- METHOD 2: SMTP FALLBACK (Gmail / Custom SMTP) ---
  console.log(`[EmailService] RESEND_API_KEY not configured. Falling back to SMTP transport.`);
  const missingKeys = [];
  if (!process.env.EMAIL_USER) missingKeys.push("EMAIL_USER");
  if (!process.env.EMAIL_PASS) missingKeys.push("EMAIL_PASS");

  if (missingKeys.length > 0) {
    throw new Error(`Email delivery failed: Neither RESEND_API_KEY nor SMTP credentials (${missingKeys.join(", ")}) are configured.`);
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Fine Flow Irrigation" <${process.env.EMAIL_USER}>`,
    to: to.trim(),
    subject,
    text,
    html: html || undefined,
    attachments: [
      {
        filename: filename || "document.pdf",
        content,
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[EmailService] Email sent successfully via SMTP. Message ID:", info.messageId);
    return { success: true, messageId: info.messageId, provider: "smtp" };
  } catch (error) {
    console.error("[EmailService] SMTP Error:", error);
    throw error;
  }
};

/**
 * Specialized helper for invoice email delivery with branded HTML template
 */
const sendInvoiceEmail = async ({
  to,
  invoiceNumber,
  customerName,
  total,
  balance,
  dueDate,
  pdfBuffer,
  recipientType = "customer", // 'customer' | 'myself'
}) => {
  const isMyself = recipientType === "myself";
  const formattedTotal = Number(total || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedBalance = Number(balance || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Due upon receipt";

  const subject = isMyself
    ? `[Invoice Record] Tax Invoice #${invoiceNumber} - ${customerName}`
    : `Tax Invoice #${invoiceNumber} from Fine Flow Irrigation`;

  const plainText = isMyself
    ? `Hello Admin,\n\nPlease find attached the record copy of Tax Invoice #${invoiceNumber} issued to ${customerName}.\nInvoice Total: ₹${formattedTotal}\nOutstanding Balance: ₹${formattedBalance}\n\nFine Flow Irrigation System`
    : `Dear ${customerName},\n\nThank you for choosing Fine Flow Irrigation.\nPlease find attached Tax Invoice #${invoiceNumber} for your recent purchase.\n\nInvoice Total: ₹${formattedTotal}\nPending Balance: ₹${formattedBalance}\nDue Date: ${dueDateStr}\n\nPlease contact us if you have any questions.\n\nWarm regards,\nFine Flow Irrigation Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #00268D 0%, #1e3a8a 100%); color: #ffffff; padding: 28px 32px; text-align: left; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin: 0; }
    .subbrand { font-size: 11px; opacity: 0.85; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .box { background: #f1f5f9; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; border-left: 4px solid #FF7A18; }
    .box-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .box-row:last-child { margin-bottom: 0; }
    .box-label { color: #64748b; font-weight: 500; }
    .box-val { font-weight: 700; color: #0f172a; }
    .total-val { color: #00268D; font-size: 15px; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="brand">FINE FLOW IRRIGATION</div>
      <div class="subbrand">Billing & Enterprise CRM</div>
    </div>
    <div class="content">
      <div class="greeting">${isMyself ? "Hello Admin," : `Dear ${customerName},`}</div>
      <p class="message">
        ${isMyself
          ? `Here is the record copy of Tax Invoice <strong>#${invoiceNumber}</strong> issued to <strong>${customerName}</strong>. The official GST PDF is attached below for your records.`
          : `Thank you for your business. Please find attached the official GST Tax Invoice <strong>#${invoiceNumber}</strong> for your records.`
        }
      </p>

      <div class="box">
        <div class="box-row">
          <span class="box-label">Invoice Number:</span>
          <span class="box-val">${invoiceNumber}</span>
        </div>
        <div class="box-row">
          <span class="box-label">Customer Name:</span>
          <span class="box-val">${customerName}</span>
        </div>
        <div class="box-row">
          <span class="box-label">Invoice Total:</span>
          <span class="box-val total-val">₹${formattedTotal}</span>
        </div>
        <div class="box-row">
          <span class="box-label">Pending Balance:</span>
          <span class="box-val" style="color: ${Number(balance) > 0 ? '#ea580c' : '#16a34a'}">₹${formattedBalance}</span>
        </div>
        <div class="box-row">
          <span class="box-label">Due Date:</span>
          <span class="box-val">${dueDateStr}</span>
        </div>
      </div>

      <p class="message" style="margin-bottom: 0;">
        ${isMyself
          ? "This is an automated notification from the Fine Flow Irrigation billing server."
          : "If you have any questions regarding this invoice or require payment assistance, please feel free to reach out to our team."
        }
      </p>
    </div>
    <div class="footer">
      Fine Flow Irrigation • GST Billing System • Official Document Attachment Included
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmailWithAttachment({
    to,
    subject,
    text: plainText,
    html: htmlContent,
    filename: `Invoice-${invoiceNumber}.pdf`,
    content: pdfBuffer,
  });
};

module.exports = {
  isValidEmail,
  sendEmailWithAttachment,
  sendInvoiceEmail,
};
