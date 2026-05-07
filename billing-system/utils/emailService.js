const nodemailer = require("nodemailer");

const sendEmailWithAttachment = async ({ to, subject, text, filename, content }) => {
  // Check for missing environment variables
  const missingKeys = [];
  if (!process.env.EMAIL_USER) missingKeys.push("EMAIL_USER");
  if (!process.env.EMAIL_PASS) missingKeys.push("EMAIL_PASS");
  
  if (missingKeys.length > 0) {
    console.error(`Missing Email Config: ${missingKeys.join(", ")}`);
    console.log("Current process.env keys (filtered):", Object.keys(process.env).filter(k => k.includes("EMAIL") || k.includes("ADMIN")));
    throw new Error(`Email configuration missing on server: ${missingKeys.join(", ")}`);
  }

  if (!to) {
    console.error("No recipient email provided (to is undefined)");
    throw new Error("Recipient email address is missing");
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
