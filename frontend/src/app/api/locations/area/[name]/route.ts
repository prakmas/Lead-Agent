import { json } from "@/server/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ name: string }> };

type PostOffice = {
  Name: string;
  District: string;
  Block: string;
  Division: string;
  State: string;
  Country: string;
  Pincode: string;
};

// Search any locality / area / village / town by NAME via the free India Post
// API (no key). This covers neighbourhoods like "Koramangala" that aren't in the
// offline city dataset.
//   GET /api/locations/area/Koramangala
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { name } = await ctx.params;
    const q = decodeURIComponent(name || "").trim();
    if (q.length < 3) return json({ message: "Type at least 3 letters" }, 400);

    const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(q)}`, {
      headers: { Accept: "application/json" },
    });
    const body = (await res.json()) as Array<{ Status: string; PostOffice?: PostOffice[] }>;
    const block = body?.[0];
    if (!block || block.Status !== "Success") return json({ data: [], query: q });

    // De-duplicate by area+district so the same locality isn't repeated.
    const seen = new Set<string>();
    const data = [];
    for (const p of block.PostOffice || []) {
      const key = `${p.Name}|${p.District}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      data.push({
        area: p.Name,
        district: p.District,
        block: p.Block,
        state: p.State,
        country: p.Country,
        pincode: p.Pincode,
        label: `${p.Name}, ${p.District}, ${p.State}`,
      });
    }
    return json({ data, query: q });
  } catch (error) {
    return json({ message: (error as Error).message || "Lookup failed" }, 502);
  }
}
