import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

export function isMailerConfigured() {
  return (
    Boolean(env.brevo.apiKey && env.brevo.senderEmail) ||
    Boolean(env.smtp.host && env.smtp.user && env.smtp.pass)
  );
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

// Brevo sends over HTTPS (works on hosts that block outbound SMTP ports) and,
// unlike Resend's sandbox mode, delivers to any recipient once its one
// sender email is verified — no domain purchase required. Preferred first.
async function sendViaBrevo({ to, subject, text, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.brevo.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: env.brevo.senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API ${res.status}: ${body}`);
  }
}

async function send({ to, subject, text, html }) {
  if (env.brevo.apiKey && env.brevo.senderEmail) {
    await sendViaBrevo({ to, subject, text, html });
    return;
  }
  await getTransporter().sendMail({ from: env.smtp.from, to, subject, text, html });
}

export async function sendPasswordResetEmail(to, resetUrl) {
  if (!isMailerConfigured()) return false;

  await send({
    to,
    subject: 'Reset your StreamBeat password',
    text: `We received a request to reset your StreamBeat password.\n\nReset it here (valid for 1 hour): ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your StreamBeat password.</p><p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour).</p><p>If you didn't request this, you can safely ignore this email.</p>`,
  });
  return true;
}

export async function sendVerificationEmail(to, verifyUrl) {
  if (!isMailerConfigured()) return false;

  await send({
    to,
    subject: 'Verify your StreamBeat email address',
    text: `Welcome to StreamBeat! Verify your email here (valid for 24 hours): ${verifyUrl}\n\nIf you didn't create this account, you can safely ignore this email.`,
    html: `<p>Welcome to StreamBeat!</p><p><a href="${verifyUrl}">Verify your email address</a> (valid for 24 hours).</p><p>If you didn't create this account, you can safely ignore this email.</p>`,
  });
  return true;
}
