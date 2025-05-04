import React, { useEffect, useState } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import MembersList from "./members-list";
// Skeletons
// Actions
import {
  createTeam,
  getTeamUsersWithMemberships,
  leaveTeam,
} from "@/app/lib/team";
import { getWorkers } from "@/app/lib/worker";
// Styles
import "../../../styles/text-styles.css";
import "../../../styles/tab-container-styles.css";
import "./teams-tab.css";
// Types
import { UserWithMembership } from "@/types/user";
import { WorkerT } from "@/types/worker";

export default function MembersTab({
  lng,
  teamId,
}: {
  lng: string;
  teamId: string;
}) {
  const { t } = useTranslation(lng, "teams-page");

  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserWithMembership[]>([]);
  const [workers, setWorkers] = useState<WorkerT[]>([]);

  //////////////////////////
  // Team Actions
  //////////////////////////

  // const handleCreateTeam = async (teamName: string) => {
  //   const newTeam = await createTeam(teamName);
  // };

  const handleGetTeamUsersAndWorkers = async () => {
    setIsLoading(true);
    const users = await getTeamUsersWithMemberships(teamId);
    const workers = await getWorkers(teamId);
    setUsers(users);
    setWorkers(workers);
    setIsLoading(false);
  };

  // const handleLeaveTeam = async (teamId: string) => {
  //   const success = await leaveTeam(teamId);
  //   if (success) {
  //     setUsers((prevTeams) =>
  //       prevTeams.filter((team) => team.team.id !== teamId)
  //     );
  //   }
  // };

  useEffect(() => {
    handleGetTeamUsersAndWorkers();
  }, []);

  return (
    <div className="tab-container-wide">
      <div className="members-tab-header">
        <span className="title">{t("teams")}</span>
        {/* <NewTeamDialog lng={lng} handleCreateTeam={handleCreateTeam} /> */}
      </div>
      {!isLoading &&
        (users.length > 0 ? (
          <MembersList
            lng={lng}
            users={users}
            // handleLeaveTeam={handleLeaveTeam}
          />
        ) : (
          <div>{t("no_member_message")}</div>
        ))}
    </div>
  );
}
