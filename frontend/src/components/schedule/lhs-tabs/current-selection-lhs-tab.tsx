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

  // Extract data from legacy ScheduleCellDataT structure for new DemandSelection component
  const getDemandSelectionProps = () => {
    if (!selectedDemand?.dailyShiftDemandsData) {
      return null;
    }

    const { dailyShiftDemandsData } = selectedDemand;
    const shift = dailyShiftDemandsData.shift;
    const date = dailyShiftDemandsData.dailyShiftDemands[0]?.date;

    if (!date) {
      return null;
    }

    // Convert legacy DailyShiftDemandT[] to ShiftDemandDTO[]
    const shiftDemands: ShiftDemandDTO[] =
      dailyShiftDemandsData.dailyShiftDemands.map((dsd) => ({
        id: dsd.id || "", // Handle cases where id might be empty for new demands
        date: typeof dsd.date === "number" ? dsd.date : dsd.date.unix(),
        shiftId: dsd.shiftId,
        teamId: dsd.teamId,
        count: dsd.count,
        notes: null, // Legacy DSDs don't have notes
        source: "manual" as const, // Map legacy DIRECT_REQUIREMENT to manual
        sourceId: null,
        createdAt: 0, // Not available in legacy structure
        updatedAt: 0, // Not available in legacy structure
      }));

    // Convert legacy AssignmentDataT[] to AssignmentT[]
    const assignments: AssignmentT[] = selectedDemand.assignmentsData.map(
      (assignmentData) => assignmentData.assignment
    );

    return {
      shift,
      date,
      shiftDemands,
      assignments,
      campaignStartDate: campaign ? dayjs(campaign.startDate) : dayjs(),
      campaignEndDate: campaign ? dayjs(campaign.endDate) : dayjs(),
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
          teamId={teamId}
          shift={demandProps.shift}
          date={demandProps.date}
          shiftDemands={demandProps.shiftDemands}
          assignments={demandProps.assignments}
          specialties={specialties}
          campaignStartDate={demandProps.campaignStartDate}
          campaignEndDate={demandProps.campaignEndDate}
          handleCreateShiftDemand={handleCreateShiftDemand}
          handleUpdateShiftDemand={handleUpdateShiftDemand}
          handleDeleteShiftDemands={async (
            shiftId: string,
            date: dayjs.Dayjs
          ) => {
            // For now, just call handleDeleteShiftDemand for all demands for this shift/date
            // This is a simplified implementation - in a full migration, we'd have better handling
            const demandsToDelete = demandProps.shiftDemands.filter(
              (d) =>
                d.shiftId === shiftId && dayjs.unix(d.date).isSame(date, "day")
            );
            for (const demand of demandsToDelete) {
              await handleDeleteShiftDemand(demand.id);
            }
          }}
        />
      )}
    </div>
  );
}
