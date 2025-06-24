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
  teamId,
  workers,
  shifts,
  schedules,
  campaign,
  selectedAssignment,
  selectedDemand,
  specialties,
  onClose,
  handleUpdateAssignment,
  handleDeleteAssignment,
  handleCreateShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: {
  lng: string;
  teamId: string;
  workers: WorkerT[];
  shifts: ShiftT[];
  schedules: ScheduleT[];
  campaign: ScheduleT | null;
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
  handleCreateShiftDemand: (
    shiftId: string,
    date: dayjs.Dayjs,
    count: number,
    notes?: string
  ) => Promise<void>;
  handleUpdateShiftDemand: (
    demandId: string,
    updates: Partial<ShiftDemandUpdateDTO>
  ) => Promise<void>;
  handleDeleteShiftDemand: (demandId: string) => Promise<void>;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  // Legacy handler converters for DemandSelection component
  const handleCreateDSD = async (legacyDemand: any) => {
    const shiftId = legacyDemand.shiftId;
    const date = legacyDemand.date;
    const count = legacyDemand.count;
    const notes = legacyDemand.notes || "";
    await handleCreateShiftDemand(shiftId, date, count, notes);
  };

  const handleUpdateDSD = async (legacyDemand: any) => {
    const demandId = legacyDemand.id;
    const updates = {
      count: legacyDemand.count,
      notes: legacyDemand.notes || null,
    };
    await handleUpdateShiftDemand(demandId, updates);
  };

  const handleDeleteDSDs = async (
    teamId: string,
    shiftId: string,
    date: dayjs.Dayjs
  ) => {
    // This will be updated when DemandSelection component is migrated
    // For now, we need to find the demand by shiftId and date, then delete it
    console.warn(
      "handleDeleteDSDs needs to be updated to work with new shift demand implementation"
    );
  };

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
          specialties={specialties}
          handleCreateDSD={handleCreateDSD}
          handleUpdateDSD={handleUpdateDSD}
          handleDeleteDSDs={handleDeleteDSDs}
        />
      )}
    </div>
  );
}
