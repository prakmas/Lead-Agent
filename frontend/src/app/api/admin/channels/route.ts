import Channel from "@/server/models/Channel.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireApiAccess(request);
  const channels = await Channel.find().sort({ type: 1 });
  return json({ data: channels });
});
