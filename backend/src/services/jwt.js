const jwt = require('jsonwebtoken');

const config = require('../config/config');

function sign(user) {
  return jwt.sign(
    { sub: user._id.toString(), phone: user.phone },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: config.jwtTtlSeconds },
  );
}

function verify(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

module.exports = { sign, verify };
