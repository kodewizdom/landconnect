/**
 * Formats internal backend role enums (`buyer`, `seller`, `broker`)
 * into user-facing display labels ("Buyer", "Owner", "Broker").
 */
export function formatRoleLabel(role?: string | null): string {
  switch ((role || "").toLowerCase()) {
    case "buyer":
      return "Buyer";
    case "seller":
      return "Owner";
    case "broker":
      return "Broker";
    default:
      return "Member";
  }
}

/**
 * Formats an internal backend role enum into an uppercase badge label
 * ("BUYER", "OWNER", "BROKER").
 */
export function formatRoleBadge(role?: string | null): string {
  return formatRoleLabel(role).toUpperCase();
}
