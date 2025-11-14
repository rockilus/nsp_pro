import SettingsLayout from "@/components/settings/settings-layout";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  // Next's generated types may make `params` a Promise in some versions.
  // Accept a Promise that resolves to the params object.
  params: Promise<{ lng: string }>;
}) {
  // Await in case `params` is a Promise (safe to await even if it's already resolved).
  const resolvedParams = await params;

  return <SettingsLayout params={resolvedParams}>{children}</SettingsLayout>;
}
