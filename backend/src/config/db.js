const mongoose = require('mongoose');

const config = require('./config');

mongoose.set('strictQuery', true);

let connectPromise;

async function connect() {
  if (!connectPromise) {
    connectPromise = mongoose
      .connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 })
      .catch((err) => {
        connectPromise = undefined;
        throw err;
      });
  }
  return connectPromise;
}

module.exports = { connect };
