import { HomePage } from "../components/home";
import { TeamStoreProvider } from "@/providers/team-store-provider";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <TeamStoreProvider>
        <HomePage />
      </TeamStoreProvider>
    </main>
  );
}
