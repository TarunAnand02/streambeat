import crypto from 'crypto';
import { generateSecret as otpGenerateSecret, generateURI, verify as otpVerify } from 'otplib';

export function generateSecret() {
  return otpGenerateSecret();
}

export function generateOtpAuthUrl(email, secret) {
  return generateURI({ issuer: 'StreamBeat', label: email, secret });
}

export async function verifyTotp(token, secret) {
  try {
    const result = await otpVerify({ secret, token });
    return result.valid;
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString('hex'));
}

export function hashBackupCode(code) {
  return crypto.createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
}
