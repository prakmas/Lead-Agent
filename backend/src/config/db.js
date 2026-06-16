import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.ATLAS_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI or ATLAS_URI is missing in backend/.env");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

export default connectDB;
