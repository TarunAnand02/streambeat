import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

export function isMailerConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
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

export async function sendPasswordResetEmail(to, resetUrl) {
  if (!isMailerConfigured()) return false;

  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: 'Reset your StreamBeat password',
    text: `We received a request to reset your StreamBeat password.\n\nReset it here (valid for 1 hour): ${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your StreamBeat password.</p><p><a href="${resetUrl}">Reset your password</a> (valid for 1 hour).</p><p>If you didn't request this, you can safely ignore this email.</p>`,
  });
  return true;
}
