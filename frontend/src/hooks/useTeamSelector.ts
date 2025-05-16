import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
import { TeamWithMembership, TeamT } from "@/types/team";
import { getUserTeamsWithMemberships } from "@/app/lib/team";

export function useTeamSelector() {
  //   const router = useRouter();
  const [teams, setTeams] = useState<TeamWithMembership[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const updateTeamInContext = (updatedTeam: TeamT) => {
    setTeams((prevTeams) =>
      prevTeams.map((t) =>
        t.team.id === updatedTeam.id ? { ...t, team: updatedTeam } : t
      )
    );
  };

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true);
      const fetchedTeams = await getUserTeamsWithMemberships();
      setTeams(fetchedTeams);

      // const urlTeamId = new URLSearchParams(window.location.search).get("team");
      const storageTeamId = localStorage.getItem("selectedTeamId");
      const fallbackTeamId = storageTeamId || fetchedTeams[0]?.team.id || null;
      // const fallbackTeamId =
      //   urlTeamId || storageTeamId || fetchedTeams[0]?.team.id || null;

      if (fallbackTeamId) {
        setSelectedTeamId(fallbackTeamId);
      }
      setLoading(false);
    };

    loadTeams();
  }, []);

  // useEffect(() => {
  //   // const urlTeamId = new URLSearchParams(window.location.search).get("team");
  //   const storageTeamId = localStorage.getItem("selectedTeamId");
  //   const fallbackTeamId = storageTeamId || teams[0]?.team.id || null;
  //   // const fallbackTeamId = urlTeamId || storageTeamId || teams[0]?.team.id || null;
  //   if (fallbackTeamId) {
  //     setSelectedTeamId(fallbackTeamId);
  //   }
  // }, [teams]);

  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem("selectedTeamId", selectedTeamId);
      //   const params = new URLSearchParams(window.location.search);
      //   params.set("team", selectedTeamId);
      //   router.replace(`?${params.toString()}`);
    }
  }, [selectedTeamId]);

  const selectedTeam = teams.find((t) => t.team.id === selectedTeamId) ?? null;

  return {
    teams,
    selectedTeam,
    setSelectedTeamId,
    loading,
    updateTeamInContext,
  };
  // return { selectedTeam, setSelectedTeamId };
}
