import React from "react";
import dayjs from "dayjs";
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
import { ShiftDemandDTO, ShiftDemandUpdateDTO } from "@/types/shiftDemand";
import { SpecialtyT } from "@/types/specialty";

export default function CurrentSelectionLHSTab({
  lng,
  workers,
  shifts,
  schedules,
  selectedAssignment,
  selectedDemand,
  specialties,
  onClose,
  handleUpdateAssignment,
  handleDeleteAssignment,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: {
  lng: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  selectedAssignment: AssignmentDataT | null;
  selectedDemand: ScheduleCellDataT | null;
  specialties: SpecialtyT[];
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
  handleUpdateShiftDemand: (
    demandId: string,
    updates: Partial<ShiftDemandUpdateDTO>
  ) => Promise<void>;
  handleDeleteShiftDemand: (demandId: string) => Promise<void>;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  // Extract data from ScheduleCellDataT structure for DemandSelection component
  const getDemandSelectionProps = () => {
    if (!selectedDemand?.shiftDemandsData?.shiftDemand) {
      return null;
    }

    const { shiftDemandsData } = selectedDemand;
    const shift = shiftDemandsData.shift;
    const shiftDemand = shiftDemandsData.shiftDemand;

    // Get date from shift demand
    const date = dayjs.unix(shiftDemand.date);

    // Convert AssignmentDataT[] to AssignmentT[]
    const assignments: AssignmentT[] = selectedDemand.assignmentsData.map(
      (assignmentData) => assignmentData.assignment
    );

    return {
      shift,
      date,
      shiftDemand: shiftDemand,
      assignments,
    };
  };

  const demandProps = getDemandSelectionProps();

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
      {selectedDemand && demandProps && (
        <DemandSelection
          lng={lng}
          shift={demandProps.shift}
          date={demandProps.date}
          shiftDemand={demandProps.shiftDemand}
          assignments={demandProps.assignments}
          specialties={specialties}
          handleUpdateShiftDemand={handleUpdateShiftDemand}
          handleDeleteShiftDemand={handleDeleteShiftDemand}
        />
      )}
    </div>
  );
}
