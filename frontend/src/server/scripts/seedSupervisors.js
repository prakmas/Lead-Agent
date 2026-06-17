import "../loadEnv.js";
import connectDB from "../config/db.js";
import AdminUser from "../models/AdminUser.js";

// Seed a few sample supervisors with different module permissions so the RBAC
// screen has data to show. Re-runnable: upserts by email. Default password for
// all sample supervisors: Super@123
const SAMPLES = [
  {
    name: "Ravi Kumar",
    email: "ravi@crr.local",
    isActive: true,
    permissions: { dashboard: "view", leads: "manage", inbox: "manage", listings: "manage", matches: "view", settings: "none" },
    // Pincode-based territory: Kaluvoya (524343) + Nellore town (524004).
    territories: [
      { level: "pincode", value: "524343" },
      { level: "pincode", value: "524004" },
    ],
  },
  {
    name: "Priya Sharma",
    email: "priya@crr.local",
    isActive: true,
    permissions: { dashboard: "view", leads: "view", inbox: "none", listings: "manage", matches: "view", settings: "none" },
    // Brodipet, Guntur (522002).
    territories: [{ level: "pincode", value: "522002" }],
  },
  {
    name: "Arjun Rao",
    email: "arjun@crr.local",
    isActive: false,
    permissions: { dashboard: "none", leads: "none", inbox: "view", listings: "none", matches: "none", settings: "none" },
    territories: [],
  },
];

const seed = async () => {
  await connectDB();

  const owner = await AdminUser.findOne({ role: "owner" });
  const passwordHash = await AdminUser.hashPassword("Super@123");

  for (const s of SAMPLES) {
    await AdminUser.findOneAndUpdate(
      { email: s.email },
      {
        name: s.name,
        email: s.email,
        role: "supervisor",
        passwordHash,
        permissions: AdminUser.cleanPermissions(s.permissions),
        territories: s.territories || [],
        isActive: s.isActive,
        createdBy: owner?._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log(`Supervisor ready: ${s.email} (${s.isActive ? "active" : "inactive"})`);
  }

  console.log("\n✅ Seeded supervisors. Login password for all samples: Super@123");
  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
