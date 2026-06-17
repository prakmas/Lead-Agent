import Contact from "@/server/models/Contact.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Edit a customer's saved details from the admin Inbox (name, phone, notes, tags).
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  await requireApiAccess(request);
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const contact = await Contact.findById(id);
  if (!contact) return json({ message: "Contact not found" }, 404);

  if (typeof body.name === "string") contact.name = body.name.trim();
  if (typeof body.phone === "string") contact.phone = body.phone.trim();
  if (typeof body.notes === "string") {
    contact.profile = { ...contact.profile, notes: body.notes };
    contact.markModified("profile");
  }
  if (Array.isArray(body.tags)) {
    contact.tags = body.tags.map((t: unknown) => String(t).trim()).filter(Boolean);
  }

  await contact.save();
  return json({ data: contact });
});
