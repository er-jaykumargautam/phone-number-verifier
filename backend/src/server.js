const config = require('./config');
const { connect } = require('./db');
const { createApp } = require('./app');

(async () => {
  try {
    await connect();
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
  createApp().listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
})();
