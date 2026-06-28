const mongoose = require("mongoose");

async function connectDb() {
  const uri = typeof process.env.MONGODB_URI === "string" ? process.env.MONGODB_URI.trim() : "";

  if (!uri) {
    throw new Error("MONGODB_URI is missing.");
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('Invalid MONGODB_URI scheme. Expected "mongodb://" or "mongodb+srv://".');
  }

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
