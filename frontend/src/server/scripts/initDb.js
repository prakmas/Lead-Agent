import "../loadEnv.js";
import connectDB from "../config/db.js";
import AdminUser from "../models/AdminUser.js";
import AuditLog from "../models/AuditLog.js";
import Channel from "../models/Channel.js";
import Contact from "../models/Contact.js";
import Conversation from "../models/Conversation.js";
import FollowUp from "../models/FollowUp.js";
import Lead from "../models/Lead.js";
import Listing from "../models/Listing.js";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const models = [
  User,
  AdminUser,
  Channel,
  Contact,
  Conversation,
  Message,
  Lead,
  Listing,
  Match,
  FollowUp,
  AuditLog,
];

const initDb = async () => {
  await connectDB();

  for (const model of models) {
    await model.createCollection();
    await model.syncIndexes();
    console.log(`Ready collection: ${model.collection.name}`);
  }

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const passwordHash = await AdminUser.hashPassword(process.env.ADMIN_PASSWORD);
    const admin = await AdminUser.findOneAndUpdate(
      { email: process.env.ADMIN_EMAIL.toLowerCase() },
      {
        name: "CRR Admin",
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        role: "owner",
        isActive: true,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    console.log(`Admin ready: ${admin.email}`);
  }

  process.exit(0);
};

initDb().catch((error) => {
  console.error(error);
  process.exit(1);
});
