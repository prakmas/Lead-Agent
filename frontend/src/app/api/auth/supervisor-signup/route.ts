import AdminUser from "@/server/models/AdminUser.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

const Users = AdminUser as unknown as { hashPassword(password: string): Promise<string> };

// Public supervisor self-signup (used by the future mobile app). Creates a
// PENDING account that an owner must approve before the supervisor can log in.
//   POST /api/auth/supervisor-signup
//   { name, phone*, pincode*, password*, email?, location? }
export const POST = route(async (request: Request) => {
  const { name, phone, pincode, password, email, location } = await request.json();

  if (!name || !phone || !pincode || !password) {
    throw createHttpError(400, "Name, phone, pincode and password are required");
  }
  if (String(password).length < 6) throw createHttpError(400, "Password must be at least 6 characters");

  const normalizedEmail = email ? String(email).toLowerCase().trim() : undefined;
  const dup: Record<string, unknown>[] = [{ phone: String(phone).trim() }];
  if (normalizedEmail) dup.push({ email: normalizedEmail });
  if (await AdminUser.findOne({ $or: dup })) {
    throw createHttpError(409, "An account with this phone or email already exists");
  }

  await AdminUser.create({
    name: String(name).trim(),
    phone: String(phone).trim(),
    pincode: String(pincode).trim(),
    location: location ? String(location).trim() : undefined,
    email: normalizedEmail,
    passwordHash: await Users.hashPassword(password),
    viewPassword: password,
    role: "supervisor",
    approvalStatus: "pending",
    isActive: false, // can't log in until approved
    territories: [{ level: "pincode", value: String(pincode).trim() }],
  });

  return json(
    { message: "Thanks for signing up! Your account is pending admin approval. You'll be able to log in once it's approved." },
    201,
  );
});
