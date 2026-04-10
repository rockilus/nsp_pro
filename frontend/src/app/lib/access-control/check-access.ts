import { routeAccess } from './route-access';
import { TeamWithMembership } from '@/types/team';

export function canAccessPage(route: string, teamWithMembership: TeamWithMembership): boolean {
  const rules = routeAccess[route];
  if (!rules) return true;

  const { roles, features } = rules;

  const roleOk = !roles || roles.includes(teamWithMembership.membership.role);

  let featuresOk = true;
  if (features) {
    featuresOk = features.every((feature) => {
      if (feature === 'use_solver') return teamWithMembership.team.useSolver;
    });
  }

  return roleOk && featuresOk;
}

// import { routeAccess } from "./routeAccess";

// type AccessContext = {
//   user: { role: string; features?: string[] };
//   team: { useSolver: boolean };
// };

// export function canAccessPage(route: string, context: AccessContext): boolean {
//   const rules = routeAccess[route];
//   if (!rules) return true;

//   const { roles, features } = rules;
//   const { user, team } = context;

//   const roleOk = !roles || roles.includes(user.role);

//   let featuresOk = true;
//   if (features) {
//     featuresOk = features.every((feature) => {
//       if (feature === "use_solver") return team.useSolver;
//       return user.features?.includes(feature);
//     });
//   }

//   return roleOk && featuresOk;
// }
