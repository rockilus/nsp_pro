import SettingsLayout from "@/components/settings/settings-layout";

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: {
    lng: string;
  };
}) {
  return <SettingsLayout params={params}>{children}</SettingsLayout>;
}
