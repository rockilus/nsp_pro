import React from "react";
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../../app/i18n/client";
// Components
import EditAssignment from "./edit-assignment";
import LHSHEader from "./lhs-header";
// Styles
import "./create-assignment.css";
// Types
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import { AssignmentT } from "@/types/assignment";
import { RecurrenceRuleT } from "@/types/recurrence";

dayjs.extend(utc);

interface CreateAssignmentProps {
  lng: string;
  teamId: string;
  scheduleId: string | null;
  workerSelectedId: string | null;
  shiftSelectedId: string | null;
  workers: WorkerT[];
  shifts: ShiftT[];
  dateSelected: Dayjs | null;
  onClose: () => void;
  handleCreateAssignment?: (
    newAssignment: AssignmentT,
    newRecurrence: RecurrenceRuleT | null
  ) => void;
}

const CreateAssignment: React.FC<CreateAssignmentProps> = ({
  lng,
  teamId,
  scheduleId,
  workerSelectedId,
  shiftSelectedId,
  workers,
  shifts,
  dateSelected,
  onClose,
  handleCreateAssignment,
}) => {
  const { t } = useTranslation(lng, "schedule-page");

  return (
    <div className="create-assignment-container">
      <LHSHEader lhsHeaderTitle={t("create_assignment")} onClose={onClose} />
      <EditAssignment
        lng={lng}
        teamId={teamId}
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
  );
};

export default CreateAssignment;
