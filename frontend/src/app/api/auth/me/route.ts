import { requireAuth } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const admin = await requireAuth(request);
  return json({
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || {},
    },
  });
});
