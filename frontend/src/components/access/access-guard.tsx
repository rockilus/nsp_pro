// import { useEffect } from "react";
// import { useRouter } from "next/navigation";
import { canAccessPage } from "@/app/lib/access-control/check-access";
import { TeamWithMembership } from "@/types/team";

type AccessGuardProps = {
  route: string; // route name used in access map
  teamWithMembership: TeamWithMembership | null;
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional fallback if access denied
};

export function AccessGuard({
  route,
  teamWithMembership,
  children,
  fallback = null,
}: AccessGuardProps) {
  if (!teamWithMembership) return <>{fallback}</>;

  const allowed = canAccessPage(route, teamWithMembership);

  // Redirect on Deny
  // if (!allowed && redirectTo) {
  //   const router = useRouter();
  //   useEffect(() => {
  //     router.push(redirectTo);
  //   }, [redirectTo]);
  //   return null;
  // }

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
