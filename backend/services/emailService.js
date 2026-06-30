import nodemailer from 'nodemailer';

// Create reusable transporter using env variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text fallback
 * @param {string} html - HTML body
 */
export const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"ScholarDesk 📅" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EmailService] Email sent to ${to} — ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${to}:`, error.message);
    throw error;
  }
};
