const express = require('express');
const cors = require('cors');

const routes = require('./routes/routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', routes);

  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
