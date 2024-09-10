import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Checkbox from "@mui/material/Checkbox";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
// Styles
import "./constraint-selector.css";
import "../../styles/text-styles.css";
// Types
import { ScheduleT } from "../../types/schedule";
import { ConstraintT } from "../../types/constraint";

dayjs.extend(utc);

export default function ConstraintSelector({
  lng,
  schedule,
  constraints,
  handleUpdateSchedule,
}: {
  lng: string;
  schedule: ScheduleT;
  constraints: ConstraintT[];
  handleUpdateSchedule: (schedule: ScheduleT) => void;
}) {
  const { t } = useTranslation(lng, "campaign-page");

  const handleUpdateScheduleConstraintIds = (constraintId: string) => {
    const updatedSchedule = {
      ...schedule,
      constraintBuildIds: schedule.constraintBuildIds.includes(constraintId)
        ? schedule.constraintBuildIds.filter((id) => id !== constraintId)
        : [...schedule.constraintBuildIds, constraintId],
    };
    handleUpdateSchedule(updatedSchedule);
  };

  const handleAddAllConstraints = () => {
    const updatedSchedule = {
      ...schedule,
      constraintBuildIds: constraints.map((c) => c.id),
    };
    handleUpdateSchedule(updatedSchedule);
  };

  const handleRemoveAllConstraints = () => {
    const updatedSchedule = {
      ...schedule,
      constraintBuildIds: [],
    };
    handleUpdateSchedule(updatedSchedule);
  };

  return (
    <div className="constraint-selector-container">
      <div className="title-container">
        <span className="title">{t("constraints")}</span>
        <div className="select-buttons-container">
          <button className="select-button" onClick={handleAddAllConstraints}>
            {t("select_all")}
          </button>
          <button
            className="select-button unselect-button"
            onClick={handleRemoveAllConstraints}
          >
            {t("select_none")}
          </button>
        </div>
      </div>
      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableBody>
            {constraints.map((constraint) => (
              <TableRow
                key={constraint.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                  <div className="check-cell-container">
                    <Checkbox
                      checked={schedule.constraintBuildIds.includes(
                        constraint.id
                      )}
                      onChange={() =>
                        handleUpdateScheduleConstraintIds(constraint.id)
                      }
                    />
                  </div>
                </TableCell>
                <TableCell component="th" scope="row" sx={{ padding: 0 }}>
                  <span
                    className={
                      constraint.active
                        ? "constraint-active"
                        : "constraint-inactive"
                    }
                  >
                    {constraint.text}
                  </span>
                  {constraint.missingProperties.length > 0 && (
                    <span className="constraint-missing-properties">
                      {"No " +
                        constraint.missingProperties
                          .flatMap((mp) => mp.propertyValues)
                          .join(", ") +
                        " property"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
