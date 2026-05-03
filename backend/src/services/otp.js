const crypto = require('crypto');

const config = require('../config/config');
const { OtpRecord, User } = require('../models/models');
const sms = require('../sms');

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

function badRequest(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function assertPhone(phone) {
  if (typeof phone !== 'string' || !PHONE_REGEX.test(phone)) {
    throw badRequest('Phone must be in E.164 format (e.g. +14155552671)');
  }
}

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function hash(salt, code) {
  return crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

async function send(phone) {
  assertPhone(phone);

  const cooldownAgo = new Date(Date.now() - config.otpCooldownSeconds * 1000);
  const recent = await OtpRecord.findOne({ phone, createdAt: { $gt: cooldownAgo } });
  if (recent) {
    throw badRequest('Please wait before requesting another code', 429);
  }

  const code = generateCode();
  const salt = crypto.randomBytes(8).toString('hex');
  const expiresAt = new Date(Date.now() + config.otpTtlSeconds * 1000);

  await OtpRecord.create({ phone, codeHash: hash(salt, code), salt, expiresAt });
  await sms.send(
    phone,
    `Your verification code is ${code}. Expires in ${Math.round(config.otpTtlSeconds / 60)} minutes.`,
  );

  return { expiresAt };
}

async function verify(phone, code) {
  assertPhone(phone);
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw badRequest('Code must be 6 digits');
  }

  const record = await OtpRecord.findOne({ phone, consumedAt: null }).sort({ createdAt: -1 });
  if (!record) throw badRequest('No active code for this phone — request a new one', 404);
  if (record.expiresAt <= new Date()) throw badRequest('Code expired — request a new one', 410);
  if (record.attempts >= config.otpMaxAttempts) {
    throw badRequest('Too many attempts — request a new code', 429);
  }

  record.attempts += 1;
  if (hash(record.salt, code) !== record.codeHash) {
    await record.save();
    throw badRequest('Incorrect code', 401);
  }

  record.consumedAt = new Date();
  await record.save();

  return User.findOneAndUpdate(
    { phone },
    { phone, isVerified: true },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

module.exports = { send, verify };
