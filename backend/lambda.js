const serverless = require('serverless-http');

const { connect } = require('./src/db');
const { createApp } = require('./src/app');

let cachedHandler;
let bootstrapPromise;

async function bootstrap() {
  await connect();
  cachedHandler = serverless(createApp());
}

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!cachedHandler) {
    if (!bootstrapPromise) {
      bootstrapPromise = bootstrap().catch((err) => {
        bootstrapPromise = undefined;
        throw err;
      });
    }
    await bootstrapPromise;
  }
  return cachedHandler(event, context);
};
