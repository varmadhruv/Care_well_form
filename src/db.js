const mongoose = require("mongoose");

const DEFAULT_URI = "mongodb://127.0.0.1:27017/CareWellUserFormRecord";

async function connectDb() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || DEFAULT_URI;

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    autoIndex: true,
  });

  return mongoose.connection;
}

module.exports = { connectDb };
