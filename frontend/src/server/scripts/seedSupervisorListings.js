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
      { title: "Sri Sai Provision Store", category: "supermarket", budget: null, ownerName: "Srinivas Reddy", ownerPhone: "9885011111", address: "Main Road, Kaluvoya", landmark: "opposite temple", timings: "Daily 7am–10pm", services: "Groceries, daily essentials, fresh produce, recharge & bill payments" },
      { title: "Kaluvoya 2BHK Flat", category: "flat", budget: 12000, ownerName: "Lakshmi Devi", ownerPhone: "9885022222", address: "2nd Cross, Kaluvoya", landmark: "beside SBI ATM", timings: "Visit 10am–6pm", services: "2BHK semi-furnished flat for family, 24x7 water, car parking" },
      { title: "Lakshmi Tiffin Center", category: "tiffin", budget: null, ownerName: "Padma", ownerPhone: "9885033333", address: "Bus Stand Road, Kaluvoya", landmark: "near RTC complex", timings: "Mon–Sat 6am–10am, 6pm–9pm", services: "Idli, dosa, vada, meals; monthly tiffin & home delivery" },
    ],
  },
  {
    email: "ravi@crr.local",
    base: { state: "Andhra Pradesh", city: "Nellore", area: "Nellore", pincode: "524004" },
    items: [
      { title: "Nellore Hardware & Electricals", category: "electrician", budget: null, ownerName: "Mohan Rao", ownerPhone: "9885044444", address: "Trunk Road, Nellore", landmark: "opposite bus stand", timings: "Mon–Sat 9am–9pm", services: "Electrical fittings, wiring, motor repair, switches & fans, on-call electrician" },
    ],
  },
  {
    email: "priya@crr.local",
    base: { state: "Andhra Pradesh", city: "Guntur", area: "Brodipet", pincode: "522002" },
    items: [
      { title: "Brodipet Single Room", category: "room", budget: 6500, ownerName: "Anjali", ownerPhone: "9885055555", address: "5th Line, Brodipet, Guntur", landmark: "near Arundelpet", timings: "Visit anytime", services: "Single room for students/bachelors, attached bath, 24x7 water" },
      { title: "Guntur Mobile Repairs", category: "mobilerepair", budget: null, ownerName: "Rahul", ownerPhone: "9885066666", address: "Brodipet Main Road, Guntur", landmark: "beside Big Bazaar", timings: "Mon–Sun 10am–9pm", services: "Mobile screen replacement, battery, software, all brands; accessories" },
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
        // Business registration details (as a supervisor would capture on-site)
        ownerName: it.ownerName,
        ownerPhone: it.ownerPhone,
        contactName: it.ownerName,
        contactPhone: it.ownerPhone,
        phoneVerified: true,
        address: it.address,
        landmark: it.landmark,
        timings: it.timings,
        services: it.services,
        mapLink: `https://maps.google.com/?q=${encodeURIComponent(`${it.title}, ${group.base.area}`)}`,
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
