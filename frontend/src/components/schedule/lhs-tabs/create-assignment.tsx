import React, { useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import { Button } from "@mui/material";

// Components
import EditAssignment from "./edit-assignment";
import CreateDemand from "./create-demand";
import LHSHEader from "./lhs-header";
// Styles
import "./create-assignment.css";
// Types
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import { AssignmentT } from "@/types/assignment";
import { RecurrenceRuleT } from "@/types/recurrence";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { TeamWithMembership } from "@/types/team";

dayjs.extend(utc);

interface CreateAssignmentProps {
  lng: string;
  teamWithMembership: TeamWithMembership;
  scheduleId: string | null;
  workerSelectedId: string | null;
  shiftSelectedId: string | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  dateSelected: Dayjs | null;
  addDemandActive: boolean;
  onClose: () => void;
  handleCreateAssignment?: (
    newAssignment: AssignmentT,
    newRecurrence: RecurrenceRuleT | null
  ) => void;
  handleCreateShiftDemand: (
    shiftId: string,
    date: dayjs.Dayjs,
    count: number,
    notes?: string
  ) => Promise<void>;
}

const CreateAssignment: React.FC<CreateAssignmentProps> = ({
  lng,
  teamWithMembership,
  scheduleId,
  workerSelectedId,
  shiftSelectedId,
  workers,
  shifts,
  dateSelected,
  addDemandActive,
  onClose,
  handleCreateAssignment,
  handleCreateShiftDemand,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  const [isCreatingDemand, setIsCreatingDemand] = useState<boolean>(false);

  const shift = shifts.find((s) => s.id === shiftSelectedId);

  const canCreateDemand = addDemandActive && shift && dateSelected;

  const handleSetIsCreatingDemand = () => {
    console.log("handleSetIsCreatingDemand called");

    if (!canCreateDemand) {
      console.warn(
        "Cannot create demand: missing shift, dateSelected, or addDemandActive is false"
      );
      return;
    }
    console.log("Setting isCreatingDemand to true");
    setIsCreatingDemand(true);
  };

  return (
    <div className="create-assignment-container">
      <LHSHEader lhsHeaderTitle={t("create_assignment")} onClose={onClose} />
      {isCreatingDemand && canCreateDemand ? (
        <CreateDemand
          lng={lng}
          shift={shift}
          dateSelected={dateSelected}
          handleCreateShiftDemand={handleCreateShiftDemand}
          handleCancel={() => setIsCreatingDemand(false)}
          recurrence={null}
        />
      ) : (
        <div>
          {teamWithMembership.team.useSolver && canCreateDemand && (
            <Button
              variant="contained"
              color="info"
              onClick={handleSetIsCreatingDemand}
              sx={{
                height: "20px",
                width: "130px",
                fontSize: "0.8rem",
                textTransform: "none",
              }}
            >
              {t("create_demand")}
            </Button>
          )}
          <EditAssignment
            lng={lng}
            teamId={teamWithMembership.team.id}
            scheduleId={scheduleId}
            workerSelectedId={workerSelectedId}
            shiftSelectedId={shiftSelectedId}
            workers={workers}
            shifts={shifts}
            dateSelected={dateSelected}
            handleCreateAssignment={handleCreateAssignment}
            isEditing={false}
          />
        </div>
      )}
    </div>
  );
};

export default CreateAssignment;
