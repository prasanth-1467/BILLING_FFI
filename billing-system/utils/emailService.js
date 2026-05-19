const nodemailer = require("nodemailer");

const sendEmailWithAttachment = async ({ to, subject, text, filename, content }) => {
  if (!to) {
    console.error("No recipient email provided (to is undefined)");
    throw new Error("Recipient email address is missing");
  }

  // --- OPTION B: RESEND HTTP API (Ideal for Render Free Tier) ---
  if (process.env.RESEND_API_KEY) {
    console.log(`Attempting to send email to: ${to} using Resend API`);
    
    // Resend requires a sender address. Standard onboarding email is "onboarding@resend.dev".
    // If the user has a custom domain verified, they can specify EMAIL_FROM, otherwise default to onboarding@resend.dev.
    // Note: onboarding@resend.dev can only send to the email address used to sign up for Resend.
    const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
    
    // Convert content (which is a PDF Buffer) to base64 for Resend attachment
    const base64Content = Buffer.isBuffer(content) 
      ? content.toString("base64") 
      : Buffer.from(content).toString("base64");

    const payload = {
      from: `Fine Flow Irrigation <${fromEmail}>`,
      to,
      subject,
      text,
      attachments: [
        {
          filename,
          content: base64Content,
        },
      ],
    };

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        console.error("Resend API error response:", responseData);
        throw new Error(responseData.message || "Resend API failed to send email");
      }

      console.log("Email sent successfully via Resend. Message ID:", responseData.id);
      return responseData;
    } catch (error) {
      console.error("RESEND ERROR:", error);
      throw error;
    }
  }

  // Check for missing environment variables for SMTP fallback
  const missingKeys = [];
  if (!process.env.EMAIL_USER) missingKeys.push("EMAIL_USER");
  if (!process.env.EMAIL_PASS) missingKeys.push("EMAIL_PASS");
  
  if (missingKeys.length > 0) {
    console.error(`Missing Email Config: ${missingKeys.join(", ")}`);
    console.log("Current process.env keys (filtered):", Object.keys(process.env).filter(k => k.includes("EMAIL") || k.includes("ADMIN") || k.includes("RESEND")));
    throw new Error(`Email configuration missing on server: ${missingKeys.join(", ")}`);
  }

  console.log(`Attempting to send email to: ${to} using ${process.env.EMAIL_USER}`);

  // Create transporter inside for better serverless compatibility
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    debug: true, // Enable debug logs from nodemailer
    logger: true // Log information to console
  });

  const mailOptions = {
    from: `"Fine Flow Irrigation" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    attachments: [
      {
        filename,
        content,
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully. Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("NODEMAILER ERROR:", error);
    throw error;
  }
};

module.exports = { sendEmailWithAttachment };
