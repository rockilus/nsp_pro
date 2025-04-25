import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import AssignmentSelection from "./assignment-selection";
import DemandSelection from "./demand-selection";
import LHSHEader from "./lhs-header";
// Styles
import "./current-selection-lhs-tab.css";
// Types
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import {
  ScheduleT,
  ScheduleCellDataT,
  AssignmentDataT,
} from "../../../types/schedule";
import { AssignmentT } from "@/types/assignment";
import { RecurrenceRuleT, RecurrenceUpdateScope } from "@/types/recurrence";
import { DailyShiftDemandT } from "@/types/daily-shift-demand";

export default function CurrentSelectionLHSTab({
  lng,
  teamId,
  workers,
  shifts,
  schedules,
  campaign,
  selectedAssignment,
  selectedDemand,
  onClose,
  handleUpdateAssignment,
  handleDeleteAssignment,
  handleCreateDSD,
  handleUpdateDSD,
}: {
  lng: string;
  teamId: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  campaign: ScheduleT | null;
  selectedAssignment: AssignmentDataT | null;
  selectedDemand: ScheduleCellDataT | null;
  onClose: () => void;
  handleUpdateAssignment: (
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null
  ) => void;
  handleDeleteAssignment: (
    assignmentId: string,
    recurrenceId: string | null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null
  ) => void;
  handleCreateDSD: (dsd: DailyShiftDemandT) => void;
  handleUpdateDSD: (dsd: DailyShiftDemandT) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  return (
    <div className="assignment-options-container">
      <LHSHEader lhsHeaderTitle={t("selection")} onClose={onClose} />
      {selectedAssignment && (
        <AssignmentSelection
          lng={lng}
          workers={workers}
          shifts={shifts}
          schedules={schedules}
          selectedAssignment={selectedAssignment}
          handleUpdateAssignment={handleUpdateAssignment}
          handleDeleteAssignment={handleDeleteAssignment}
        />
      )}
      {selectedDemand && (
        <DemandSelection
          lng={lng}
          teamId={teamId}
          campaign={campaign}
          selectedDemand={selectedDemand}
          handleCreateDSD={handleCreateDSD}
          handleUpdateDSD={handleUpdateDSD}
        />
      )}
    </div>
  );
}
