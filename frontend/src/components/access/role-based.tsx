// Types
import { TeamMembershipRole } from "@/types/team";

type RoleBasedProps = {
  role: TeamMembershipRole | null;
  allowedRoles: TeamMembershipRole[];
  children: React.ReactNode;
};

/**
 * Conditional rendering component for role-based UI features.
 *
 * Use this component to hide/show specific UI elements (buttons, sections, features)
 * within a page based on user role. Returns `null` if access is denied.
 *
 * **Important**: This component does NOT redirect users or show error messages.
 * For protecting entire pages with redirect behavior, use `AccessGuard` instead.
 *
 * @example
 * // Hide "Create Worker" button from members
 * <RoleBased
 *   role={user.role}
 *   allowedRoles={[TeamMembershipRole.OWNER]}
 * >
 *   <CreateWorkerButton />
 * </RoleBased>
 */
export function RoleBased({ role, allowedRoles, children }: RoleBasedProps) {
  if (!role || !allowedRoles.includes(role)) return null;
  return <>{children}</>;
}
