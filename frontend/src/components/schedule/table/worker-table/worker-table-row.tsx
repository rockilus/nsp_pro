import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// MUI
import TableRow from "@mui/material/TableRow";
// Components
import WorkerRowHeaderCell from "./worker-row-header-cell";
import WorkerCell from "./worker-cell";
// Types
import { ShiftT } from "../../../../types/shift";
import { WorkerT } from "../../../../types/worker";
import {
  AssignmentT,
  BreachT,
  ScheduleT,
  SelectedCellT,
  ScheduleStatus,
} from "../../../../types/schedule";
import { RequestT } from "../../../../types/request";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export default function WorkerTableRow({
  lng,
  shifts,
  worker,
  requests,
  assignments,
  scheduleCampaign,
  periodDates,
  breaches,
  showBreaches,
  handleCellSelection,
}: {
  lng: string;
  shifts: ShiftT[];
  worker: WorkerT;
  requests: RequestT[];
  assignments: AssignmentT[];
  scheduleCampaign: ScheduleT | null;
  periodDates: { date: dayjs.Dayjs; scheduleStatus: ScheduleStatus | null }[];
  breaches: BreachT[];
  showBreaches: boolean;
  handleCellSelection: (selectedCell: SelectedCellT) => void;
}) {
  return (
    <TableRow>
      <WorkerRowHeaderCell
        lng={lng}
        shifts={shifts}
        worker={worker}
        assignments={assignments}
        scheduleCampaign={scheduleCampaign}
      />
      {periodDates.map((pDate, dateIndex) => (
        <WorkerCell
          key={dateIndex}
          periodDate={pDate}
          scheduleCampaign={scheduleCampaign}
          worker={worker}
          shifts={shifts}
          requests={requests}
          assignments={assignments}
          breaches={breaches}
          showBreaches={showBreaches}
          handleCellSelection={handleCellSelection}
        />
      ))}
    </TableRow>
  );
}
