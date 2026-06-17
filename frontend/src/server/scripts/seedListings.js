import "../loadEnv.js";
import connectDB from "../config/db.js";
import Listing from "../models/Listing.js";

// Bulk, realistic listing inventory for the lead-matching engine. Keywords drive
// matching, so each entry carries the words a customer is likely to type.
const listings = [
  // ── Accommodation: Bangalore ──────────────────────────────────────────────
  {
    title: "Furnished 2BHK near Koramangala metro",
    description: "Spacious fully furnished 2BHK, covered parking, near metro, ideal for working professionals or small family.",
    category: "accommodation",
    location: "Koramangala, Bangalore",
    budget: 28000,
    availability: "immediate",
    keywords: ["furnished", "2bhk", "flat", "apartment", "metro", "parking", "family", "professional"],
  },
  {
    title: "Semi-furnished 1BHK in HSR Layout",
    description: "Cozy 1BHK, semi-furnished, 24x7 water and security, near tech parks and restaurants.",
    category: "accommodation",
    location: "HSR Layout, Bangalore",
    budget: 18000,
    availability: "immediate",
    keywords: ["1bhk", "semi-furnished", "flat", "security", "tech park", "bachelors"],
  },
  {
    title: "Single room PG for women in HSR Layout",
    description: "Safe PG with home-cooked meals, WiFi, laundry and housekeeping for working women.",
    category: "accommodation",
    location: "HSR Layout, Bangalore",
    budget: 12000,
    availability: "immediate",
    keywords: ["pg", "women", "ladies", "meals", "wifi", "single", "laundry"],
  },
  {
    title: "Sharing PG for men near Marathahalli",
    description: "Double sharing PG for men, meals included, walking distance to IT companies.",
    category: "accommodation",
    location: "Marathahalli, Bangalore",
    budget: 9000,
    availability: "immediate",
    keywords: ["pg", "men", "gents", "sharing", "meals", "it", "budget"],
  },
  {
    title: "Studio apartment in Indiranagar",
    description: "Compact furnished studio near pubs, cafes and metro. Perfect for singles.",
    category: "accommodation",
    location: "Indiranagar, Bangalore",
    budget: 22000,
    availability: "this week",
    keywords: ["studio", "furnished", "compact", "single", "metro", "1rk"],
  },
  {
    title: "Spacious 3BHK in Whitefield",
    description: "Large 3BHK in gated community with gym, pool and clubhouse. Family friendly.",
    category: "accommodation",
    location: "Whitefield, Bangalore",
    budget: 38000,
    availability: "next month",
    keywords: ["3bhk", "gated", "gym", "pool", "family", "apartment", "clubhouse"],
  },
  {
    title: "Budget single room near Electronic City",
    description: "Affordable single room close to Infosys and Wipro tech parks. Bachelors welcome.",
    category: "accommodation",
    location: "Electronic City, Bangalore",
    budget: 9000,
    availability: "immediate",
    keywords: ["budget", "room", "single", "tech park", "bachelors", "affordable"],
  },
  {
    title: "2BHK in BTM Layout for family",
    description: "Well-ventilated 2BHK, family only, close to schools and market.",
    category: "accommodation",
    location: "BTM Layout, Bangalore",
    budget: 24000,
    availability: "immediate",
    keywords: ["2bhk", "family", "school", "market", "flat"],
  },
  {
    title: "Premium 1BHK in Jayanagar",
    description: "Newly renovated 1BHK in a quiet residential area, ample parking.",
    category: "accommodation",
    location: "Jayanagar, Bangalore",
    budget: 20000,
    availability: "this week",
    keywords: ["1bhk", "renovated", "parking", "quiet", "residential"],
  },
  {
    title: "Luxury 3BHK villa in Sarjapur Road",
    description: "Independent villa with private garden, 3 bedrooms, modular kitchen.",
    category: "accommodation",
    location: "Sarjapur Road, Bangalore",
    budget: 55000,
    availability: "next month",
    keywords: ["villa", "3bhk", "independent", "garden", "luxury", "modular kitchen"],
  },
  {
    title: "Affordable 1RK in JP Nagar",
    description: "Compact 1RK suitable for a single person, near bus stand.",
    category: "accommodation",
    location: "JP Nagar, Bangalore",
    budget: 11000,
    availability: "immediate",
    keywords: ["1rk", "single", "budget", "compact", "bus"],
  },
  {
    title: "Fully furnished 2BHK in Hebbal",
    description: "Furnished 2BHK near airport road, great for couples and professionals.",
    category: "accommodation",
    location: "Hebbal, Bangalore",
    budget: 26000,
    availability: "immediate",
    keywords: ["2bhk", "furnished", "airport", "couple", "professional"],
  },

  // ── Accommodation: other cities ───────────────────────────────────────────
  {
    title: "2BHK independent house in Nellore",
    description: "Independent 2BHK house with car parking in a calm locality, near main road.",
    category: "accommodation",
    location: "Nellore",
    budget: 12000,
    availability: "immediate",
    keywords: ["2bhk", "independent", "house", "parking", "nellore"],
  },
  {
    title: "1BHK flat for rent in Nellore town",
    description: "Budget 1BHK flat close to bus stand and market, ideal for small family.",
    category: "accommodation",
    location: "Nellore",
    budget: 7000,
    availability: "immediate",
    keywords: ["1bhk", "flat", "budget", "family", "nellore", "market"],
  },
  {
    title: "Furnished 2BHK in Gachibowli, Hyderabad",
    description: "Furnished 2BHK near financial district and IT offices, gated society.",
    category: "accommodation",
    location: "Gachibowli, Hyderabad",
    budget: 25000,
    availability: "immediate",
    keywords: ["2bhk", "furnished", "it", "gated", "hyderabad", "financial district"],
  },
  {
    title: "PG for men in Madhapur, Hyderabad",
    description: "Single and double sharing PG with food, near Hitech City.",
    category: "accommodation",
    location: "Madhapur, Hyderabad",
    budget: 8500,
    availability: "immediate",
    keywords: ["pg", "men", "sharing", "food", "hitech city", "hyderabad"],
  },
  {
    title: "3BHK apartment in OMR, Chennai",
    description: "Sea-facing 3BHK on OMR IT corridor, semi-furnished, covered parking.",
    category: "accommodation",
    location: "OMR, Chennai",
    budget: 30000,
    availability: "next month",
    keywords: ["3bhk", "omr", "it", "semi-furnished", "parking", "chennai"],
  },

  // ── Roommate ──────────────────────────────────────────────────────────────
  {
    title: "Roommate wanted for 3BHK in Whitefield",
    description: "Looking for a friendly working professional to share a spacious 3BHK.",
    category: "roommate",
    location: "Whitefield, Bangalore",
    budget: 15000,
    availability: "next month",
    keywords: ["roommate", "sharing", "3bhk", "professional", "friendly"],
  },
  {
    title: "Female roommate needed in Koramangala",
    description: "Sharing a 2BHK with one other working woman, fully furnished.",
    category: "roommate",
    location: "Koramangala, Bangalore",
    budget: 14000,
    availability: "immediate",
    keywords: ["roommate", "female", "women", "2bhk", "furnished", "sharing"],
  },
  {
    title: "Male roommate for 2BHK in HSR Layout",
    description: "One bedroom available in a 2BHK shared by two working men.",
    category: "roommate",
    location: "HSR Layout, Bangalore",
    budget: 11000,
    availability: "this week",
    keywords: ["roommate", "male", "men", "2bhk", "sharing"],
  },
  {
    title: "Flatmate wanted near Gachibowli",
    description: "Looking for a clean, non-smoking flatmate to share a 2BHK near IT hub.",
    category: "roommate",
    location: "Gachibowli, Hyderabad",
    budget: 10000,
    availability: "immediate",
    keywords: ["flatmate", "roommate", "sharing", "non-smoking", "it", "hyderabad"],
  },

  // ── Rental (commercial / other) ───────────────────────────────────────────
  {
    title: "Commercial office space in Indiranagar",
    description: "800 sqft office space on 100ft road, ready to move, ample parking.",
    category: "rental",
    location: "Indiranagar, Bangalore",
    budget: 60000,
    availability: "immediate",
    keywords: ["office", "commercial", "workspace", "parking", "shop"],
  },
  {
    title: "Retail shop for rent in BTM Layout",
    description: "Ground floor shop facing main road, suitable for retail or cafe.",
    category: "rental",
    location: "BTM Layout, Bangalore",
    budget: 35000,
    availability: "next month",
    keywords: ["shop", "retail", "commercial", "cafe", "main road"],
  },
  {
    title: "Warehouse / godown near Electronic City",
    description: "2000 sqft godown space with truck access, 24x7 security.",
    category: "rental",
    location: "Electronic City, Bangalore",
    budget: 45000,
    availability: "immediate",
    keywords: ["warehouse", "godown", "storage", "commercial", "truck"],
  },
  {
    title: "Co-working desk in Koramangala",
    description: "Dedicated desk in a premium co-working space, high-speed internet, meeting rooms.",
    category: "rental",
    location: "Koramangala, Bangalore",
    priceLabel: "₹8000/seat/month",
    budget: 8000,
    availability: "immediate",
    keywords: ["coworking", "desk", "office", "internet", "startup"],
  },

  // ── Services ──────────────────────────────────────────────────────────────
  {
    title: "Home cleaning and cook service",
    description: "Daily cleaning and home-cooked meals, flexible timing, verified staff.",
    category: "services",
    location: "Bangalore",
    priceLabel: "₹6000/month",
    budget: 6000,
    availability: "immediate",
    keywords: ["cleaning", "cook", "maid", "daily", "service", "housekeeping"],
  },
  {
    title: "Packers and movers - Bangalore",
    description: "Affordable house shifting with packing, loading and insurance.",
    category: "services",
    location: "Bangalore",
    priceLabel: "from ₹4000",
    budget: 4000,
    availability: "immediate",
    keywords: ["packers", "movers", "shifting", "relocation", "transport"],
  },
  {
    title: "Electrician and plumbing on call",
    description: "Same-day electrical and plumbing repairs, transparent pricing.",
    category: "services",
    location: "Bangalore",
    priceLabel: "₹300 visit",
    budget: 300,
    availability: "immediate",
    keywords: ["electrician", "plumber", "repair", "maintenance", "handyman"],
  },
  {
    title: "Painting service for homes",
    description: "Interior and exterior painting, free site visit and quote.",
    category: "services",
    location: "Hyderabad",
    priceLabel: "₹12/sqft",
    availability: "next week",
    keywords: ["painting", "painter", "interior", "exterior", "home"],
  },
  {
    title: "AC service and repair",
    description: "AC installation, gas refill and servicing for all brands.",
    category: "services",
    location: "Chennai",
    priceLabel: "₹499 service",
    budget: 499,
    availability: "immediate",
    keywords: ["ac", "air conditioner", "repair", "service", "installation"],
  },
];

const seedListings = async () => {
  await connectDB();

  let created = 0;
  for (const listing of listings) {
    const res = await Listing.findOneAndUpdate(
      { title: listing.title },
      { ...listing, status: "active" },
      { upsert: true, setDefaultsOnInsert: true, new: true, rawResult: true },
    );
    if (res?.lastErrorObject?.updatedExisting === false) created += 1;
  }

  const total = await Listing.countDocuments({ status: "active" });
  console.log(`Upserted ${listings.length} listings (${created} new). Active listings now: ${total}`);
  process.exit(0);
};

seedListings().catch((error) => {
  console.error(error);
  process.exit(1);
});
