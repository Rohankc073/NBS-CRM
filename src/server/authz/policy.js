export const ROLES = ["super_admin", "admin", "sales_agent", "telecaller"];

export const ROLE_LABEL = {
  super_admin: "Super Admin",
  admin: "Admin",
  sales_agent: "Sales Agent",
  telecaller: "Telecaller",
};

export function canManageUsers(user) {
  return user?.role === "super_admin";
}
