import dotenv from "dotenv";
import connectDB from "../config/db.js";
import AdminUser from "../models/AdminUser.js";

dotenv.config();

const seedAdmin = async () => {
  await connectDB();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
  }

  const passwordHash = await AdminUser.hashPassword(password);
  const admin = await AdminUser.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      name: "CRR Admin",
      email: email.toLowerCase(),
      passwordHash,
      role: "owner",
      isActive: true,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  console.log(`Admin ready: ${admin.email}`);
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
