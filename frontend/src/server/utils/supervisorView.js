// Shape a supervisor document for the client: includes the admin-viewable
// password but NEVER the password hash.
export const supervisorView = (s) => ({
  _id: s._id,
  name: s.name,
  email: s.email,
  phone: s.phone,
  location: s.location,
  pincode: s.pincode,
  role: s.role,
  permissions: s.permissions,
  territories: s.territories,
  isActive: s.isActive,
  approvalStatus: s.approvalStatus,
  viewPassword: s.viewPassword,
  lastLoginAt: s.lastLoginAt,
  createdAt: s.createdAt,
});
