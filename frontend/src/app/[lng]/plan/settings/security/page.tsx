import SecurityTab from "@/components/settings/security/security-tab";

export default function SecurityPage({
  params: { lng },
}: {
  params: {
    lng: string;
  };
}) {
  return <SecurityTab lng={lng} />;
}
