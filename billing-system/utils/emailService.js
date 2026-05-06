const nodemailer = require("nodemailer");

const sendEmailWithAttachment = async ({ to, subject, text, filename, content }) => {
  // Check for missing environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("Missing Email Config. Available EMAIL keys:", Object.keys(process.env).filter(k => k.includes("EMAIL")));
    throw new Error("Email configuration missing on server");
  }

  // Create transporter inside for better serverless compatibility
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
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
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

module.exports = { sendEmailWithAttachment };
