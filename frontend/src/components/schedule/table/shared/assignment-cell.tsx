import React from "react";
// Styles
import "./assignment-cell.css";
// Types
import {
  AssignmentDataT,
  ScheduleViewSettingsT,
} from "../../../../types/schedule";
// Constants
import { ShiftColorMappings } from "../../../../constants/constants";

export default function AssignmentCell({
  assignmentData,
  scheduleViewSettings,
  handleAssignmentSelection,
}: {
  assignmentData: AssignmentDataT;
  scheduleViewSettings: ScheduleViewSettingsT;
  handleAssignmentSelection: (seletedCell: AssignmentDataT) => void;
}) {
  const { background, text } = ShiftColorMappings[
    assignmentData.shift.color
  ] || {
    background: "#f5f5f5",
    text: "#212121",
  };

  return (
    <div
      className="assignment-cell-container"
      onClick={() => handleAssignmentSelection(assignmentData)}
      style={
        {
          "--bg-color": background,
          "--text-color": text,
        } as React.CSSProperties
      }
    >
      <span className="a-cell-title">
        {scheduleViewSettings.groupBy === "worker"
          ? scheduleViewSettings.timeFrame === "week"
            ? assignmentData.shift.name
            : assignmentData.shift.acronym
          : scheduleViewSettings.groupBy === "shift"
          ? scheduleViewSettings.timeFrame === "week"
            ? assignmentData.worker.name
            : assignmentData.worker.acronym
          : null}
      </span>
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
