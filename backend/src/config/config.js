const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';

const mongoUri = process.env.MONGO_URI || '';
if (!isTest && !mongoUri) {
  throw new Error('MONGO_URI is required (set it in backend/.env)');
}

const jwtSecret = process.env.JWT_SECRET || '';
if (!isTest && (!jwtSecret || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET is required and must be at least 32 chars');
}

const smsTransport = process.env.SMS_TRANSPORT === 'twilio' ? 'twilio' : 'console';

if (smsTransport === 'twilio') {
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  if (!/^AC[0-9a-f]{32}$/i.test(sid)) {
    throw new Error('TWILIO_ACCOUNT_SID must start with "AC" followed by 32 hex chars');
  }
  if (!process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('TWILIO_AUTH_TOKEN is required when SMS_TRANSPORT=twilio');
  }
  if (!/^\+[1-9]\d{6,14}$/.test(process.env.TWILIO_FROM_NUMBER || '')) {
    throw new Error('TWILIO_FROM_NUMBER must be E.164 (e.g. +15555551234)');
  }
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,
  mongoUri,
  jwtSecret: jwtSecret || 'test-only-secret-not-for-production-use-32c',
  jwtTtlSeconds: parseInt(process.env.JWT_TTL_SECONDS || '3600', 10),
  otpTtlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
  otpCooldownSeconds: parseInt(process.env.OTP_COOLDOWN_SECONDS || '60', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  smsTransport,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },
};
