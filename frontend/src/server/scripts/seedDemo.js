import "../loadEnv.js";
import connectDB from "../config/db.js";
import Listing from "../models/Listing.js";
import { processInboundMessage } from "../services/conversation.service.js";

const demoListings = [
  {
    title: "2BHK furnished flat near Koramangala",
    description: "Spacious furnished flat, close to metro, ideal for working professionals.",
    category: "accommodation",
    location: "Koramangala, Bangalore",
    budget: 28000,
    availability: "immediate",
    keywords: ["furnished", "2bhk", "flat", "metro", "professional"],
  },
  {
    title: "Single room PG for women in HSR Layout",
    description: "Safe PG with meals, WiFi, and housekeeping for working women.",
    category: "accommodation",
    location: "HSR Layout, Bangalore",
    budget: 12000,
    availability: "immediate",
    keywords: ["pg", "women", "meals", "wifi", "single"],
  },
  {
    title: "Roommate wanted for 3BHK in Whitefield",
    description: "Looking for a friendly roommate to share a 3BHK apartment.",
    category: "roommate",
    location: "Whitefield, Bangalore",
    budget: 15000,
    availability: "next month",
    keywords: ["roommate", "sharing", "3bhk", "friendly"],
  },
  {
    title: "Studio apartment in Indiranagar",
    description: "Compact studio near pubs and cafes, fully furnished.",
    category: "accommodation",
    location: "Indiranagar, Bangalore",
    budget: 22000,
    availability: "this week",
    keywords: ["studio", "furnished", "compact", "indiranagar"],
  },
  {
    title: "Home cleaning and cook service",
    description: "Daily cleaning and home-cooked meals, flexible timing.",
    category: "services",
    location: "Bangalore",
    priceLabel: "₹6000/month",
    availability: "immediate",
    keywords: ["cleaning", "cook", "maid", "daily", "service"],
  },
  {
    title: "Budget room near Electronic City",
    description: "Affordable single room close to tech parks.",
    category: "accommodation",
    location: "Electronic City, Bangalore",
    budget: 9000,
    availability: "immediate",
    keywords: ["budget", "room", "tech park", "affordable"],
  },
];

const demoMessages = [
  {
    channel: "whatsapp",
    contactId: "919900000001",
    contactName: "Aarav",
    message: "Looking for a furnished 2bhk flat in Koramangala under 30000 immediately",
  },
  {
    channel: "instagram",
    contactId: "ig_user_2002",
    contactName: "Priya",
    message: "Need a PG for women in HSR Layout around 12000 with meals",
  },
  {
    channel: "facebook",
    contactId: "fb_user_3003",
    contactName: "Rahul",
    message: "Want a roommate to share a flat in Whitefield, budget 15000 next month",
  },
];

const seedDemo = async () => {
  await connectDB();

  for (const listing of demoListings) {
    await Listing.findOneAndUpdate(
      { title: listing.title },
      { ...listing, status: "active" },
      { upsert: true, setDefaultsOnInsert: true, new: true },
    );
  }
  console.log(`Seeded ${demoListings.length} listings`);

  for (const message of demoMessages) {
    const result = await processInboundMessage({
      ...message,
      accountId: `${message.channel}-seed`,
      messageType: "text",
      timestamp: new Date(),
      providerMessageId: `seed-${message.contactId}`,
      metadata: { seeded: true },
    });
    console.log(
      `Processed ${message.channel} lead from ${message.contactName}: ` +
        `${result.matches.length} match(es)`,
    );
  }

  console.log("Demo data ready. Open the dashboard to explore.");
  process.exit(0);
};

seedDemo().catch((error) => {
  console.error(error);
  process.exit(1);
});
