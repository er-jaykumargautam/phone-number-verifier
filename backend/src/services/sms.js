const config = require('./config');

let twilioClient;

function getTwilio() {
  if (!twilioClient) {
    twilioClient = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
  }
  return twilioClient;
}

async function send(phone, message) {
  if (config.smsTransport === 'twilio') {
    try {
      await getTwilio().messages.create({
        to: phone,
        from: config.twilio.fromNumber,
        body: message,
      });
    } catch (err) {
      const wrapped = new Error(`Failed to send SMS: ${err.message}`);
      wrapped.status = 502;
      throw wrapped;
    }
    return;
  }
  console.log(`[sms] to=${phone} :: ${message}`);
}

module.exports = { send };
