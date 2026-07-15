export const ROLES = ["super_admin", "admin", "sales_agent", "telecaller"];

export const ROLE_LABEL = {
  super_admin: "Super Admin",
  admin: "Admin",
  sales_agent: "Sales Agent",
  telecaller: "Telecaller",
};

// Admins and Super Admins can SEE the user list.
export function canViewUsers(user) {
  return user?.role === "super_admin" || user?.role === "admin";
}

export function canManageUsers(user) {
  return user?.role === "super_admin";
}


// ── Properties ──────────────────────────────────────────────────────

// Telecallers can't touch property data (per the roadmap). Everyone else
// can create — but WHERE it lands differs (see autoApprovesProperty).
export function canCreateProperty(user) {
  return (
    user?.role === "super_admin" ||
    user?.role === "admin" ||
    user?.role === "sales_agent"
  );
}

// Admin & Super Admin creations go live instantly. Agent creations queue
// for review. This single function decides 'approved' vs 'pending' on create.
export function autoApprovesProperty(user) {
  return user?.role === "super_admin" || user?.role === "admin";
}

// Only Admin & Super Admin can approve, reject, or edit anyone's property.
export function canApproveProperty(user) {
  return user?.role === "super_admin" || user?.role === "admin";
}

