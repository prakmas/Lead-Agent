import mongoose from "mongoose";

// Cache the connection across hot reloads (dev) and across serverless
// invocations so we never open more than one Mongo connection per instance.
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  const mongoUri = process.env.MONGODB_URI || process.env.ATLAS_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI or ATLAS_URI is missing in .env.local");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongoUri).then((m) => {
      console.log("MongoDB connected");
      return m;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

export default connectDB;
