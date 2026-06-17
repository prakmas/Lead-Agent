import "../loadEnv.js";
import connectDB from "../config/db.js";
import AdminUser from "../models/AdminUser.js";
import Listing from "../models/Listing.js";

// Seed a few listings "registered" by each supervisor in their own pincode, so
// the per-supervisor view + filters have real data. Re-runnable: clears prior
// seeded supervisor listings (marked via metadata.seededFor) first.
const PLAN = [
  {
    email: "ravi@crr.local",
    base: { state: "Andhra Pradesh", city: "Nellore", area: "Kaluvoya", pincode: "524343" },
    items: [
      { title: "Sri Sai Provision Store", category: "supermarket", budget: null },
      { title: "Kaluvoya 2BHK Flat", category: "flat", budget: 12000 },
      { title: "Lakshmi Tiffin Center", category: "tiffin", budget: null },
    ],
  },
  {
    email: "ravi@crr.local",
    base: { state: "Andhra Pradesh", city: "Nellore", area: "Nellore", pincode: "524004" },
    items: [{ title: "Nellore Hardware & Electricals", category: "electrician", budget: null }],
  },
  {
    email: "priya@crr.local",
    base: { state: "Andhra Pradesh", city: "Guntur", area: "Brodipet", pincode: "522002" },
    items: [
      { title: "Brodipet Single Room", category: "room", budget: 6500 },
      { title: "Guntur Mobile Repairs", category: "mobilerepair", budget: null },
    ],
  },
];

const seed = async () => {
  await connectDB();
  await Listing.deleteMany({ "metadata.seededFor": { $exists: true } });

  let created = 0;
  for (const group of PLAN) {
    const sup = await AdminUser.findOne({ email: group.email });
    if (!sup) {
      console.log(`  ! supervisor ${group.email} not found — run seedSupervisors first`);
      continue;
    }
    for (const it of group.items) {
      await Listing.create({
        title: it.title,
        category: it.category,
        budget: it.budget || undefined,
        location: `${group.base.area}, ${group.base.city}`,
        status: "active",
        createdBy: sup._id,
        metadata: { ...group.base, country: "India", seededFor: group.email },
      });
      created++;
    }
    console.log(`  ✓ ${group.email} → ${group.items.length} listings in ${group.base.area} (${group.base.pincode})`);
  }

  console.log(`\n✅ Seeded ${created} supervisor listings.`);
  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
