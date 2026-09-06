const nodemailer = require('nodemailer');

// Configure the transporter using environment variables
// Expected env variables:
// EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendPasswordResetEmail = async (to, link) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not configured.');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"FixLink Support" <noreply@fixlink.com>',
    to,
    subject: 'FixLink Password Reset',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset for your FixLink account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${link}">${link}</a>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,<br>The FixLink Team</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
