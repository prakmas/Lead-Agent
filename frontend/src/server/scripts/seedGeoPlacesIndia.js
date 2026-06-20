import "../loadEnv.js";
import fs from "node:fs";
import readline from "node:readline";
import connectDB from "../config/db.js";
import GeoPlace from "../models/GeoPlace.js";

// Seed the deep India gazetteer from a GeoNames `IN.txt` dump (tab-delimited).
// Usage:  node src/server/scripts/seedGeoPlacesIndia.js /path/to/IN.txt
// Re-runnable: clears the geoplaces collection first.
//
// Two streaming passes over the 66 MB file (low memory):
//   pass 1 → build state (ADM1) and district (ADM2) code→name maps
//   pass 2 → insert every populated place (class P) with resolved names

const FILE =
  process.argv[2] ||
  "/Users/praveenmaddela/Desktop/Resume for jobs/IN/IN.txt";

// Tidy the official ADM1 labels into plain state names.
const cleanState = (s = "") =>
  s
    .replace(/^State of\s+/i, "")
    .replace(/^Union Territory of\s+/i, "")
    .replace(/^National Capital Territory of\s+/i, "")
    .trim();

// GeoNames feature code → a friendly display type.
const placeType = (code) => {
  if (["PPLC", "PPLA", "PPLA2"].includes(code)) return "city";
  if (["PPLA3", "PPLA4", "PPLA5"].includes(code)) return "town";
  if (["PPLX", "PPLL"].includes(code)) return "locality";
  return "village";
};

// Abandoned / historical / destroyed places — not useful for live listings.
const SKIP = new Set(["PPLQ", "PPLH", "PPLW"]);

const lineReader = () =>
  readline.createInterface({
    input: fs.createReadStream(FILE, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

const run = async () => {
  if (!fs.existsSync(FILE)) {
    console.error(`File not found: ${FILE}\nPass the path: node seedGeoPlacesIndia.js /path/to/IN.txt`);
    process.exit(1);
  }

  await connectDB();
  console.log(`Reading ${FILE}`);

  // ── Pass 1: admin code → name maps ──
  const stateByCode = new Map(); // "16" → "Mahārāshtra"
  const districtByCode = new Map(); // "16.520" → "Pune"

  for await (const line of lineReader()) {
    const c = line.split("\t");
    if (c[6] !== "A") continue;
    const code = c[7];
    const adm1 = c[10];
    const adm2 = c[11];
    if (code === "ADM1") stateByCode.set(adm1, cleanState(c[1]));
    else if (code === "ADM2" && adm1 && adm2) districtByCode.set(`${adm1}.${adm2}`, c[1]);
  }
  console.log(`Pass 1 done: ${stateByCode.size} states, ${districtByCode.size} districts`);

  // ── Reset collection ──
  await GeoPlace.deleteMany({});

  // ── Pass 2: insert populated places ──
  const CHUNK = 5000;
  let batch = [];
  let inserted = 0;

  const flush = async () => {
    if (!batch.length) return;
    await GeoPlace.insertMany(batch, { ordered: false });
    inserted += batch.length;
    batch = [];
    if (inserted % 50000 < CHUNK) console.log(`  inserted ${inserted.toLocaleString()}…`);
  };

  for await (const line of lineReader()) {
    const c = line.split("\t");
    if (c[6] !== "P") continue; // populated places only
    const code = c[7];
    if (SKIP.has(code)) continue;

    const name = c[1];
    const ascii = (c[2] || c[1] || "").toLowerCase().trim();
    if (!name || !ascii) continue;

    const adm1 = c[10];
    const adm2 = c[11];
    batch.push({
      name,
      search: ascii,
      state: stateByCode.get(adm1) || "",
      district: districtByCode.get(`${adm1}.${adm2}`) || "",
      type: placeType(code),
      lat: c[4] ? Number(c[4]) : undefined,
      lng: c[5] ? Number(c[5]) : undefined,
    });

    if (batch.length >= CHUNK) await flush();
  }
  await flush();

  const total = await GeoPlace.countDocuments();
  console.log(`\n✅ Seeded geoplaces: ${total.toLocaleString()} places across India`);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
