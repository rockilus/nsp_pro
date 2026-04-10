import React from 'react';
// MUI
import Checkbox from '@mui/material/Checkbox';
// Styles
import './assignment-cell.css';
// Types
import { AssignmentDataT, ScheduleViewSettingsT } from '../../../../types/schedule';
import { ShiftType } from '@/types/shift';
import { TeamMembershipRole, TeamWithMembership } from '@/types/team';
// Constants
import { ShiftColorMappings } from '../../../../constants/constants';

export default function AssignmentCell({
  assignmentData,
  scheduleViewSettings,
  handleAssignmentSelection,
  teamWithMembership,
  isSelectionActive,
  isSelected,
  onAssignmentSelect,
}: {
  assignmentData: AssignmentDataT;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (seletedCell: AssignmentDataT) => void;
  teamWithMembership: TeamWithMembership;
  isSelectionActive: boolean;
  isSelected: boolean;
  onAssignmentSelect: () => void;
}) {
  const { background, sample, text } = ShiftColorMappings[assignmentData.shift.color] || {
    background: '#f5f5f5',
    sample: '#9e9e9e',
    text: '#212121',
  };

  return (
    <div
      className="assignment-cell-container"
      data-testid={`assignment-cell-${assignmentData.assignment.id}`}
      onClick={() => {
        if (teamWithMembership.membership.role === TeamMembershipRole.OWNER) {
          if (isSelectionActive && onAssignmentSelect) {
            onAssignmentSelect();
          } else {
            handleAssignmentSelection(assignmentData);
          }
        }
      }}
      style={
        {
          '--bg-color': background,
          '--text-color': text,
          position: 'relative',
          cursor:
            teamWithMembership.membership.role === TeamMembershipRole.OWNER ? 'pointer' : 'default',
          outline: isSelected ? '2px solid #1976d2' : undefined,
          outlineOffset: isSelected ? '-2px' : undefined,
        } as React.CSSProperties
      }
    >
      {isSelectionActive && (
        <Checkbox
          size="small"
          checked={!!isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onAssignmentSelect?.();
          }}
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            padding: '1px',
            zIndex: 5,
            '& .MuiSvgIcon-root': { fontSize: 14 },
          }}
        />
      )}
      <span className="a-cell-title">
        {scheduleViewSettings.groupBy === 'worker'
          ? scheduleViewSettings.timeFrame === 'week'
            ? assignmentData.shift.name
            : assignmentData.shift.acronym
          : scheduleViewSettings.groupBy === 'shift'
            ? scheduleViewSettings.timeFrame === 'week'
              ? assignmentData.worker.name
              : assignmentData.worker.acronym
            : null}
      </span>
      {scheduleViewSettings.groupBy === 'worker' && scheduleViewSettings.timeFrame === 'week' && (
        <div className="a-cell-shift-times-container">
          <span className="a-cell-shift-times-text">
            {assignmentData.shift.startTime.format('HH:mm')}
          </span>
          <span className="a-cell-shift-times-text">{' - '}</span>
          <span className="a-cell-shift-times-text">
            {assignmentData.shift.endTime.format('HH:mm')}
            {!assignmentData.shift.endTime.isSame(assignmentData.shift.startTime, 'day') && (
              <sup>+1</sup>
            )}
          </span>
        </div>
      )}
      {scheduleViewSettings.groupBy === 'worker' && (
        <div
          className={`a-cell-shift-type-marker ${
            assignmentData.shift.shiftType === ShiftType.DUTY ? 'duty' : 'other'
          }`}
          style={{ '--bg-color': sample } as React.CSSProperties}
        ></div>
      )}
      {assignmentData.assignment.fixed && (
        <span className="assignment-fixed-lock" aria-label="fixed">
          🔒
        </span>
      )}
    </div>
  );
}

// import React from "react";
// import dayjs from "dayjs";
// import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
// import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
// // MUI
// import AddCircleIcon from "@mui/icons-material/AddCircle";
// import IconButton from "@mui/material/IconButton";
// import TableCell from "@mui/material/TableCell";
// // Components
// import { generateOwnerIdDateKey } from "../shared/assignment-utils";
// // Styles
// import "./shift-cell.css";
// // Types
// import { ShiftT } from "../../../../types/shift";
// import {
//   ScheduleT,
//   periodDateT,
//   AssignmentDataT,
//   AssignmentsDictT,
//   ScheduleCellDataT,
// } from "../../../../types/schedule";
// import { CreateAssignmentT } from "@/types/assignment";
// import { RequestStatus } from "../../../../types/request";

// dayjs.extend(isSameOrAfter);
// dayjs.extend(isSameOrBefore);

// export default function ShiftCell({
//   periodDate,
//   scheduleCampaign,
//   shift,
//   shiftIdDateToAssignData,
//   scheduleCellData,
//   showBreaches,
//   handleAssignmentSelection,
//   handleOpenCreateAssignment,
// }: {
//   periodDate: periodDateT;
//   scheduleCampaign: ScheduleT | null;
//   shift: ShiftT;
//   shiftIdDateToAssignData: AssignmentsDictT;
//   scheduleCellData: ScheduleCellDataT;
//   showBreaches: boolean;
//   handleAssignmentSelection: (seletedCell: AssignmentDataT) => void;
//   handleOpenCreateAssignment: (createAssignment: CreateAssignmentT) => void;
// }) {
//   const AssignmentDiv = ({
//     aDataDict,
//     isLastAssignment,
//   }: {
//     aDataDict: AssignmentDataT;
//     isLastAssignment: boolean;
//   }) => {
//     const assignmentFixed =
//       scheduleCampaign &&
//       aDataDict.assignment.scheduleId === scheduleCampaign.id &&
//       aDataDict.assignment.fixed;
//     const breachHard =
//       aDataDict.breaches.some((b) => b.hardToSoft) ||
//       aDataDict.requests.some(
//         (r) => r.hard && r.status === RequestStatus.REJECTED && r.active
//       );
//     const breachSoft =
//       !breachHard &&
//       (aDataDict.breaches.some((b) => !b.hardToSoft) ||
//         aDataDict.requests.some(
//           (r) => !r.hard && r.status === RequestStatus.REJECTED && r.active
//         ));
//     return (
//       <div
//         className={`assignment-div-container ${
//           isLastAssignment ? "last" : ""
//         } ${
//           showBreaches && breachHard
//             ? "hard-breach"
//             : showBreaches && breachSoft
//             ? "soft-breach"
//             : ""
//         }`}
//         onClick={() => handleAssignmentSelection(aDataDict)}
//       >
//         <span className={`worker-name-cell ${assignmentFixed ? "fix" : ""}`}>
//           {aDataDict.worker.acronym}
//         </span>
//       </div>
//     );
//   };

//   const CellContent = ({}) => {
//     const shiftDateKey = generateOwnerIdDateKey(shift.id, periodDate.date);
//     const aDataDicts: AssignmentDataT[] =
//       shiftIdDateToAssignData[shiftDateKey] || [];

//     return (
//       <div className="cell-content-container">
//         {aDataDicts.map((aDataDict, addIndex) => {
//           return (
//             <AssignmentDiv
//               key={addIndex}
//               aDataDict={aDataDict}
//               isLastAssignment={addIndex === aDataDicts.length - 1}
//             />
//           );
//         })}
//       </div>
//     );
//   };

//   return (
//     <TableCell
//       className="cell-hover-container"
//       sx={{
//         align: "center",
//         borderRight: "1px solid #e0e0e07d",
//         padding: 0,
//         position: "relative",
//       }}
//     >
//       <CellContent />
//       <IconButton
//         className="add-icon-button"
//         sx={{
//           position: "absolute",
//           bottom: -12, // Adjust spacing from the bottom
//           right: "50%",
//           transform: "translateX(50%)",
//           opacity: 0,
//           transition: "opacity 0.3s",
//           padding: 0,
//           zIndex: 10,
//           pointerEvents: "auto",
//         }}
//         onClick={() =>
//           handleOpenCreateAssignment({
//             scheduleId: periodDate.scheduleId,
//             workerId: null,
//             shiftId: shift.id,
//             date: periodDate.date,
//           })
//         }
//       >
//         <AddCircleIcon />
//       </IconButton>
//     </TableCell>
//   );
// }
