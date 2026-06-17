import "../loadEnv.js";
import connectDB from "../config/db.js";
import Listing from "../models/Listing.js";

// ── Location hierarchy: [country, state, city, area] ─────────────────────────
// A spread across priority India + USA metros and key areas.
const LOCS = [
  // India — Karnataka / Bangalore
  ["India", "Karnataka", "Bangalore", "Koramangala"],
  ["India", "Karnataka", "Bangalore", "HSR Layout"],
  ["India", "Karnataka", "Bangalore", "Indiranagar"],
  ["India", "Karnataka", "Bangalore", "Whitefield"],
  ["India", "Karnataka", "Bangalore", "Marathahalli"],
  ["India", "Karnataka", "Bangalore", "JP Nagar"],
  ["India", "Karnataka", "Bangalore", "Electronic City"],
  ["India", "Karnataka", "Bangalore", "Hebbal"],
  ["India", "Karnataka", "Bangalore", "Jayanagar"],
  ["India", "Karnataka", "Bangalore", "BTM Layout"],
  ["India", "Karnataka", "Mysuru", "Gokulam"],
  // India — Telangana / Hyderabad
  ["India", "Telangana", "Hyderabad", "Gachibowli"],
  ["India", "Telangana", "Hyderabad", "Hitech City"],
  ["India", "Telangana", "Hyderabad", "Madhapur"],
  ["India", "Telangana", "Hyderabad", "Kondapur"],
  ["India", "Telangana", "Hyderabad", "Banjara Hills"],
  ["India", "Telangana", "Hyderabad", "Kompally"],
  // India — Andhra Pradesh
  ["India", "Andhra Pradesh", "Visakhapatnam", "MVP Colony"],
  ["India", "Andhra Pradesh", "Visakhapatnam", "Madhurawada"],
  ["India", "Andhra Pradesh", "Vijayawada", "Benz Circle"],
  ["India", "Andhra Pradesh", "Guntur", "Brodipet"],
  ["India", "Andhra Pradesh", "Nellore", "Nellore"],
  ["India", "Andhra Pradesh", "Tirupati", "Renigunta Road"],
  // India — Maharashtra
  ["India", "Maharashtra", "Mumbai", "Andheri"],
  ["India", "Maharashtra", "Mumbai", "Bandra"],
  ["India", "Maharashtra", "Mumbai", "Borivali"],
  ["India", "Maharashtra", "Pune", "Hinjewadi"],
  ["India", "Maharashtra", "Pune", "Baner"],
  ["India", "Maharashtra", "Pune", "Kharadi"],
  // India — Tamil Nadu
  ["India", "Tamil Nadu", "Chennai", "OMR"],
  ["India", "Tamil Nadu", "Chennai", "Velachery"],
  ["India", "Tamil Nadu", "Chennai", "Anna Nagar"],
  ["India", "Tamil Nadu", "Coimbatore", "Peelamedu"],
  // India — Delhi NCR
  ["India", "Delhi", "New Delhi", "Saket"],
  ["India", "Haryana", "Gurgaon", "Sohna Road"],
  ["India", "Haryana", "Gurgaon", "Golf Course Road"],
  ["India", "Uttar Pradesh", "Noida", "Sector 62"],
  ["India", "Uttar Pradesh", "Noida", "Sector 137"],
  // India — others
  ["India", "Gujarat", "Ahmedabad", "SG Highway"],
  ["India", "Gujarat", "Surat", "Vesu"],
  ["India", "Rajasthan", "Jaipur", "Malviya Nagar"],
  ["India", "Kerala", "Kochi", "Kakkanad"],
  ["India", "West Bengal", "Kolkata", "Salt Lake"],
  ["India", "Chandigarh", "Chandigarh", "Sector 17"],
  ["India", "Uttar Pradesh", "Lucknow", "Gomti Nagar"],

  // USA — California
  ["USA", "California", "Los Angeles", "Downtown LA"],
  ["USA", "California", "Los Angeles", "Hollywood"],
  ["USA", "California", "Los Angeles", "Santa Monica"],
  ["USA", "California", "San Francisco", "SoMa"],
  ["USA", "California", "San Francisco", "Mission District"],
  ["USA", "California", "San Diego", "La Jolla"],
  ["USA", "California", "San Diego", "Pacific Beach"],
  ["USA", "California", "San Jose", "Willow Glen"],
  // USA — Texas
  ["USA", "Texas", "Houston", "Katy"],
  ["USA", "Texas", "Houston", "Sugar Land"],
  ["USA", "Texas", "Dallas", "Plano"],
  ["USA", "Texas", "Dallas", "Frisco"],
  ["USA", "Texas", "Dallas", "Irving"],
  ["USA", "Texas", "Austin", "Round Rock"],
  ["USA", "Texas", "Austin", "Downtown"],
  ["USA", "Texas", "San Antonio", "Stone Oak"],
  // USA — Florida
  ["USA", "Florida", "Miami", "Brickell"],
  ["USA", "Florida", "Miami", "Wynwood"],
  ["USA", "Florida", "Orlando", "Lake Nona"],
  ["USA", "Florida", "Tampa", "Westshore"],
  // USA — New York
  ["USA", "New York", "New York City", "Manhattan"],
  ["USA", "New York", "New York City", "Brooklyn"],
  ["USA", "New York", "New York City", "Queens"],
  ["USA", "New York", "Buffalo", "Amherst"],
  // USA — Illinois / WA / GA / NC / AZ / CO / MA / NJ
  ["USA", "Illinois", "Chicago", "Loop"],
  ["USA", "Illinois", "Chicago", "Lincoln Park"],
  ["USA", "Washington", "Seattle", "Capitol Hill"],
  ["USA", "Washington", "Seattle", "Bellevue"],
  ["USA", "Georgia", "Atlanta", "Midtown"],
  ["USA", "Georgia", "Atlanta", "Buckhead"],
  ["USA", "North Carolina", "Charlotte", "Uptown"],
  ["USA", "Arizona", "Phoenix", "Scottsdale"],
  ["USA", "Colorado", "Denver", "Downtown"],
  ["USA", "Massachusetts", "Boston", "Back Bay"],
  ["USA", "Massachusetts", "Boston", "Cambridge"],
  ["USA", "New Jersey", "Jersey City", "Hoboken"],
];

const pick = (arr, i) => arr[i % arr.length];

// Build one listing of a given type for a given location + index.
const buildListing = (category, [country, state, city, area], i) => {
  const inr = country === "India";
  const sym = inr ? "₹" : "$";
  const loc = `${area}, ${city}`;
  const baseKeywords = [area.toLowerCase(), city.toLowerCase(), state.toLowerCase()];
  const avail = pick(["immediate", "this week", "next month"], i);

  // Residential price scale (monthly) — India in ₹, USA in $.
  const flatPrice = inr ? 12000 + (i % 7) * 4000 : 1400 + (i % 7) * 350;
  const pgPrice = inr ? 7000 + (i % 5) * 1500 : 800 + (i % 5) * 150;
  const roomPrice = inr ? 6000 + (i % 5) * 1200 : 700 + (i % 5) * 120;
  const housePrice = inr ? 22000 + (i % 6) * 6000 : 2200 + (i % 6) * 500;
  const hotelPrice = inr ? 1800 + (i % 5) * 700 : 110 + (i % 5) * 45;

  const T = {
    flat: {
      title: `${pick(["1BHK", "2BHK", "3BHK"], i)} Flat in ${area}`,
      description: `Well-maintained ${pick(["1BHK", "2BHK", "3BHK"], i)} apartment in ${loc}, ${pick(["semi-furnished", "fully furnished", "unfurnished"], i)}, with parking and 24x7 water.`,
      budget: flatPrice,
      priceLabel: `${sym}${flatPrice.toLocaleString("en-IN")}/month`,
      keywords: ["flat", "apartment", "bhk", "furnished", ...baseKeywords],
    },
    pg: {
      title: `${pick(["Comfort", "Sunrise", "Urban", "Cozy"], i)} PG in ${area}`,
      description: `${pick(["Single", "Double", "Triple"], i)} sharing PG in ${loc} with meals, WiFi, laundry and housekeeping. ${pick(["For men", "For women", "Co-ed"], i)}.`,
      budget: pgPrice,
      priceLabel: `${sym}${pgPrice.toLocaleString("en-IN")}/month`,
      keywords: ["pg", "hostel", "paying guest", "meals", "wifi", ...baseKeywords],
    },
    room: {
      title: `Single Room for Rent in ${area}`,
      description: `Affordable single room in ${loc}, ideal for students or working professionals. Close to transport and markets.`,
      budget: roomPrice,
      priceLabel: `${sym}${roomPrice.toLocaleString("en-IN")}/month`,
      keywords: ["room", "single room", "room for rent", "budget", ...baseKeywords],
    },
    roommate: {
      title: `Roommate Wanted in ${area}`,
      description: `Looking for a ${pick(["friendly", "working", "non-smoking"], i)} roommate to share a ${pick(["2BHK", "3BHK"], i)} in ${loc}. Furnished and well-connected.`,
      budget: roomPrice + 2000,
      priceLabel: `${sym}${(roomPrice + 2000).toLocaleString("en-IN")}/month`,
      keywords: ["roommate", "flatmate", "sharing", "flat share", ...baseKeywords],
    },
    house: {
      title: `Independent ${pick(["House", "Villa", "Duplex"], i)} in ${area}`,
      description: `Spacious independent ${pick(["house", "villa", "duplex"], i)} in ${loc} with private parking and garden. Family preferred.`,
      budget: housePrice,
      priceLabel: `${sym}${housePrice.toLocaleString("en-IN")}/month`,
      keywords: ["house", "villa", "independent house", "duplex", "family", ...baseKeywords],
    },
    hotel: {
      title: `${pick(["Comfort", "Grand", "Royal", "City"], i)} Stay Hotel, ${area}`,
      description: `${pick(["3-star", "4-star", "budget"], i)} hotel in ${loc} with clean rooms, breakfast and easy access to the city. Great for short stays.`,
      budget: hotelPrice,
      priceLabel: `${sym}${hotelPrice.toLocaleString("en-IN")}/night`,
      keywords: ["hotel", "lodge", "short stay", "rooms", "breakfast", ...baseKeywords],
    },
    supermarket: {
      title: `${pick(["FreshMart", "DailyNeeds", "GreenBasket", "SuperSave"], i)} Supermarket, ${area}`,
      description: `Supermarket and grocery store in ${loc} with fresh produce, daily essentials, and home delivery.`,
      priceLabel: "open daily",
      keywords: ["supermarket", "grocery", "groceries", "mart", "store", ...baseKeywords],
    },
    rental: {
      title: `${pick(["Office Space", "Commercial Shop", "Co-working Desk", "Retail Space"], i)} in ${area}`,
      description: `${pick(["Furnished office", "Ground-floor shop", "Co-working desk", "Retail unit"], i)} in ${loc}, ready to move, with parking.`,
      budget: inr ? 30000 + (i % 6) * 10000 : 1800 + (i % 6) * 600,
      priceLabel: `${sym}${(inr ? 30000 + (i % 6) * 10000 : 1800 + (i % 6) * 600).toLocaleString("en-IN")}/month`,
      keywords: ["office", "commercial", "shop", "coworking", "retail", "workspace", ...baseKeywords],
    },
    service: {
      title: `${pick(["Home Cleaning & Cook", "Packers & Movers", "Electrician & Plumbing", "AC Service & Repair"], i)} in ${area}`,
      description: `${pick(["Daily cleaning and home-cooked meals", "House shifting with packing and insurance", "Same-day electrical and plumbing repairs", "AC install, gas refill and servicing"], i)} serving ${loc} and nearby.`,
      priceLabel: pick(["from ₹6000/month", "from ₹4000", "₹300 visit", "₹499 service"], i),
      keywords: ["service", "cleaning", "movers", "packers", "repair", "electrician", ...baseKeywords],
    },
  };

  const t = T[category];
  return {
    title: t.title,
    description: t.description,
    category,
    location: loc,
    budget: t.budget,
    priceLabel: t.priceLabel,
    availability: avail,
    keywords: t.keywords,
    status: "active",
    metadata: { country, state, city, area },
  };
};

// Rotate through all categories so every type appears across the locations.
const CATS = ["flat", "pg", "room", "roommate", "house", "hotel", "supermarket", "rental", "service"];

const seed = async () => {
  await connectDB();

  const listings = [];
  const RESIDENTIAL = ["flat", "pg", "room", "roommate", "house"];
  const OTHERS = ["hotel", "supermarket", "rental", "service"];
  LOCS.forEach((loc, li) => {
    // Guarantee the 5 residential types in EVERY location so common searches
    // (e.g. "PG in Whitefield") always have a match…
    RESIDENTIAL.forEach((cat) => listings.push(buildListing(cat, loc, li)));
    // …plus rotate two of the other types per location for variety.
    listings.push(buildListing(OTHERS[li % OTHERS.length], loc, li));
    listings.push(buildListing(OTHERS[(li + 2) % OTHERS.length], loc, li + 1));
  });

  let created = 0;
  for (const l of listings) {
    const res = await Listing.findOneAndUpdate(
      { title: l.title, location: l.location },
      l,
      { upsert: true, setDefaultsOnInsert: true, new: true, rawResult: true },
    );
    if (res?.lastErrorObject?.updatedExisting === false) created += 1;
  }

  const total = await Listing.countDocuments({ status: "active" });
  const byCat = await Listing.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: "$category", n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  console.log(`Upserted ${listings.length} service listings (${created} new). Active total: ${total}`);
  console.log("By category:", byCat.map((c) => `${c._id}:${c.n}`).join("  "));
  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
