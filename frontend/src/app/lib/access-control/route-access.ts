import { TeamMembershipRole } from "@/types/team";

export const routeAccess: Record<
  string,
  { roles?: TeamMembershipRole[]; features?: string[] }
> = {
  "/workers": { roles: [TeamMembershipRole.OWNER] },
  "/shifts": { roles: [TeamMembershipRole.OWNER] },
  "/coverages": { roles: [TeamMembershipRole.OWNER], features: ["use_solver"] },
  "/constraints": {
    roles: [TeamMembershipRole.OWNER],
    features: ["use_solver"],
  },
  "/campaign": { roles: [TeamMembershipRole.OWNER] },
  "/shift-demands": { roles: [TeamMembershipRole.OWNER] },
  "/stats": { roles: [TeamMembershipRole.OWNER] },
  "/teams": { roles: [TeamMembershipRole.OWNER] },
};

// export const routeAccess: Record<string, { roles?: string[]; features?: string[] }> = {
//   "/solver": { features: ["use_solver"] },
//   "/team-settings": { roles: ["owner"] },
//   "/admin": { roles: ["admin"], features: ["advanced_settings"] },
// };
