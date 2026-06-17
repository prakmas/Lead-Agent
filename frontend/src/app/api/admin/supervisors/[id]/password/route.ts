import AdminUser from "@/server/models/AdminUser.js";
import { requireOwner } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

const Users = AdminUser as unknown as { hashPassword(password: string): Promise<string> };

type Ctx = { params: Promise<{ id: string }> };

// Owner sets / resets a supervisor's password.
export const POST = route(async (request: Request, ctx: Ctx) => {
  await requireOwner(request);
  const { id } = await ctx.params;
  const { password } = await request.json();
  if (!password || String(password).length < 6) {
    throw createHttpError(400, "Password must be at least 6 characters");
  }

  const supervisor = await AdminUser.findOne({ _id: id, role: "supervisor" });
  if (!supervisor) throw createHttpError(404, "Supervisor not found");

  supervisor.passwordHash = await Users.hashPassword(password);
  await supervisor.save();

  return json({ message: "Password updated" });
});
