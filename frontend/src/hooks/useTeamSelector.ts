import { useEffect, useState, useRef } from 'react';
// import { useRouter } from "next/navigation";
import { TeamWithMembership, TeamT } from '@/types/team';
import { useGetUserTeamsWithMemberships } from './useTeam';

export function useTeamSelector() {
  //   const router = useRouter();
  const getUserTeamsWithMemberships = useGetUserTeamsWithMemberships();
  const [teams, setTeams] = useState<TeamWithMembership[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track if we've already fetched to prevent multiple calls
  const hasFetched = useRef(false);

  const updateTeamInContext = (updatedTeam: TeamT) => {
    setTeams((prevTeams) =>
      prevTeams.map((t) => (t.team.id === updatedTeam.id ? { ...t, team: updatedTeam } : t)),
    );
  };

  useEffect(() => {
    // Prevent multiple simultaneous calls
    if (hasFetched.current) {
      return;
    }

    const loadTeams = async () => {
      hasFetched.current = true;

      try {
        setLoading(true);
        setError(null);
        const fetchedTeams = await getUserTeamsWithMemberships();
        setTeams(fetchedTeams);

        // const urlTeamId = new URLSearchParams(window.location.search).get("team");
        const storageTeamId = localStorage.getItem('selectedTeamId');
        const fallbackTeamId = storageTeamId || fetchedTeams[0]?.team.id || null;
        // const fallbackTeamId =
        //   urlTeamId || storageTeamId || fetchedTeams[0]?.team.id || null;

        if (fallbackTeamId) {
          setSelectedTeamId(fallbackTeamId);
        }
      } catch (err) {
        console.error('Failed to fetch teams:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch teams');
        // Reset the flag on error to allow retry
        hasFetched.current = false;
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [getUserTeamsWithMemberships]); // getUserTeamsWithMemberships is now stable with useCallback

  // useEffect(() => {
  //   // const urlTeamId = new URLSearchParams(window.location.search).get("team");
  //   const storageTeamId = localStorage.getItem("selectedTeamId");
  //   const fallbackTeamId = storageTeamId || teams[0]?.team.id || null;
  //   // const fallbackTeamId = urlTeamId || storageTeamId || teams[0]?.team.id || null;
  //   if (fallbackTeamId) {
  //     setSelectedTeamId(fallbackTeamId);
  //   }
  // }, [teams]);

  const setSelectedTeamIdAndPersist = (id: string | null) => {
    if (id) {
      localStorage.setItem('selectedTeamId', id);
    }
    setSelectedTeamId(id);
  };

  const addTeamToContext = (team: TeamWithMembership) => {
    setTeams((prev) => [...prev, team]);
  };

  const selectedTeam = teams.find((t) => t.team.id === selectedTeamId) ?? null;

  return {
    teams,
    selectedTeam,
    selectedTeamId,
    setSelectedTeamId: setSelectedTeamIdAndPersist,
    loading,
    error,
    updateTeamInContext,
    addTeamToContext,
    // Add a manual refresh function for explicit updates
    refresh: () => {
      hasFetched.current = false;
      setLoading(true);
    },
  };
  // return { selectedTeam, setSelectedTeamId };
}
