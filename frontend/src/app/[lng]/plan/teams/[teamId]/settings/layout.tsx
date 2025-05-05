import TeamSettingsLayout from "@/components/teams-settings/team-settings-layout";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: {
    lng: string;
    teamId: string;
  };
}) {
  return <TeamSettingsLayout params={params}>{children}</TeamSettingsLayout>;
}
