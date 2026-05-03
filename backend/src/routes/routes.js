const express = require('express');

const otp = require('../services/otp');
const jwtSvc = require('../services/jwt');
const { authenticate } = require('./auth');
const { User } = require('../models/models');

const router = express.Router();

router.post('/send-otp', async (req, res) => {
  const { phone } = req.body || {};
  const { expiresAt } = await otp.send(phone);
  res.json({ message: 'OTP sent', expiresAt });
});

router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body || {};
  const user = await otp.verify(phone, code);
  res.json({
    token: jwtSvc.sign(user),
    user: { id: user._id, phone: user.phone, isVerified: user.isVerified },
  });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user._id, phone: user.phone, isVerified: user.isVerified });
});

module.exports = router;
