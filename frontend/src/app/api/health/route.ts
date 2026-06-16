import mongoose from "mongoose";
import connectDB from "@/server/config/db.js";
import { json } from "@/server/http.js";

export const dynamic = "force-dynamic";

export async function GET() {
  let database = "disconnected";
  try {
    await connectDB();
    database = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  } catch {
    database = "disconnected";
  }
  return json({ message: "Backend API is running", database });
}
