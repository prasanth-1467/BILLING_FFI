const nodemailer = require("nodemailer");

const sendEmailWithAttachment = async ({ to, subject, text, filename, content }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully");
  } catch (error) {
    console.error("SMTP verification failed:", error);
    throw new Error("Email service is currently unavailable");
  }

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

  return transporter.sendMail(mailOptions);
};

module.exports = { sendEmailWithAttachment };
