const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const otpSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    salt: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', userSchema);
const OtpRecord = mongoose.model('OtpRecord', otpSchema);

module.exports = { User, OtpRecord };
