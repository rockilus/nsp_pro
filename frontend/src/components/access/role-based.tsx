// Types
import { TeamMembershipRole } from "@/types/team";

type RoleBasedProps = {
  role: TeamMembershipRole | null;
  allowedRoles: TeamMembershipRole[];
  children: React.ReactNode;
};

export function RoleBased({ role, allowedRoles, children }: RoleBasedProps) {
  if (!role || !allowedRoles.includes(role)) return null;
  return <>{children}</>;
}
