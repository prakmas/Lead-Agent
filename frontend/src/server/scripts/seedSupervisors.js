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
    phone: "9876500001",
    location: "Kaluvoya, Nellore",
    pincode: "524343",
    isActive: true,
    approvalStatus: "approved",
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
    phone: "9876500002",
    location: "Brodipet, Guntur",
    pincode: "522002",
    isActive: true,
    approvalStatus: "approved",
    permissions: { dashboard: "view", leads: "view", inbox: "none", listings: "manage", matches: "view", settings: "none" },
    territories: [{ level: "pincode", value: "522002" }],
  },
  {
    name: "Arjun Rao",
    email: "arjun@crr.local",
    phone: "9876500003",
    location: "Nellore",
    pincode: "524001",
    isActive: false,
    approvalStatus: "approved",
    permissions: { dashboard: "none", leads: "none", inbox: "view", listings: "none", matches: "none", settings: "none" },
    territories: [],
  },
  // A PENDING self-signup, to demo the approval flow.
  {
    name: "Suresh Babu",
    email: "suresh@crr.local",
    phone: "9876500004",
    location: "Tirupati",
    pincode: "517501",
    isActive: false,
    approvalStatus: "pending",
    permissions: { dashboard: "none", leads: "none", inbox: "none", listings: "none", matches: "none", settings: "none" },
    territories: [{ level: "pincode", value: "517501" }],
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
        phone: s.phone,
        location: s.location,
        pincode: s.pincode,
        role: "supervisor",
        passwordHash,
        viewPassword: "Super@123",
        approvalStatus: s.approvalStatus || "approved",
        permissions: AdminUser.cleanPermissions(s.permissions),
        territories: s.territories || [],
        isActive: s.isActive,
        createdBy: owner?._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log(`Supervisor ready: ${s.email} (${s.approvalStatus || "approved"}, ${s.isActive ? "active" : "inactive"})`);
  }

  console.log("\n✅ Seeded supervisors. Login password for all samples: Super@123");
  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
