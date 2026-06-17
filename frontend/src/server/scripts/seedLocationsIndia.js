import "../loadEnv.js";
import csc from "country-state-city";
import connectDB from "../config/db.js";
import Location from "../models/Location.js";

const { State, City } = csc;

// Seed all Indian states/UTs and their cities into the Location reference
// collection. Re-runnable: clears India docs first, then bulk-inserts.
const seed = async () => {
  await connectDB();

  await Location.deleteMany({ countryCode: "IN" });

  const states = State.getStatesOfCountry("IN");
  const docs = [];

  for (const s of states) {
    docs.push({
      country: "India",
      countryCode: "IN",
      state: s.name,
      stateCode: s.isoCode,
      type: "state",
      name: s.name,
      label: s.name,
      search: s.name.toLowerCase(),
    });

    const cities = City.getCitiesOfState("IN", s.isoCode);
    for (const c of cities) {
      docs.push({
        country: "India",
        countryCode: "IN",
        state: s.name,
        stateCode: s.isoCode,
        city: c.name,
        type: "city",
        name: c.name,
        label: `${c.name}, ${s.name}`,
        search: c.name.toLowerCase(),
      });
    }
  }

  // Bulk insert in chunks.
  const CHUNK = 1000;
  for (let i = 0; i < docs.length; i += CHUNK) {
    await Location.insertMany(docs.slice(i, i + CHUNK), { ordered: false });
  }

  const total = await Location.countDocuments({ countryCode: "IN" });
  console.log(`Seeded India locations: ${states.length} states/UTs + cities = ${total} docs`);
  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
