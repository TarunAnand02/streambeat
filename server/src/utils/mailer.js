import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

export function isMailerConfigured() {
  return Boolean(env.resend.apiKey) || Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
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

// Resend sends over HTTPS (port 443), which works on hosts that block
// outbound SMTP ports (25/465/587) — a common free-tier restriction that
// makes nodemailer hang or fail silently even with correct credentials.
async function sendViaResend({ to, subject, text, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.resend.from, to, subject, text, html }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API ${res.status}: ${body}`);
  }
}

async function send({ to, subject, text, html }) {
  if (env.resend.apiKey) {
    await sendViaResend({ to, subject, text, html });
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
