import { json } from "@/server/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ pin: string }> };

type PostOffice = {
  Name: string;
  District: string;
  Block: string;
  Division: string;
  State: string;
  Country: string;
  Pincode: string;
};

// District / area / village / pincode lookup via the free India Post API
// (no key). Gives the deepest level of the hierarchy on demand.
//   GET /api/locations/pincode/560034
export async function GET(_request: Request, ctx: Ctx) {
  try {
    const { pin } = await ctx.params;
    if (!/^\d{6}$/.test(pin)) return json({ message: "Invalid pincode (need 6 digits)" }, 400);

    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      headers: { Accept: "application/json" },
    });
    const body = (await res.json()) as Array<{ Status: string; PostOffice?: PostOffice[] }>;
    const block = body?.[0];
    if (!block || block.Status !== "Success") return json({ data: [], pincode: pin });

    const data = (block.PostOffice || []).map((p) => ({
      area: p.Name,
      district: p.District,
      block: p.Block,
      division: p.Division,
      state: p.State,
      country: p.Country,
      pincode: p.Pincode,
    }));
    return json({ data, pincode: pin });
  } catch (error) {
    return json({ message: (error as Error).message || "Lookup failed" }, 502);
  }
}
