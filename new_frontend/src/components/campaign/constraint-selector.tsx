import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Components
import TableAddButton from "../buttons/table-add-button";
// Types
import { ScheduleT } from "../../types/schedule_temp";
import { ConstraintT } from "../../types/constraint";
// Constants
import {
  ConstraintColorActiveText,
  ConstraintColorInactiveText,
} from "../../constants/constants";

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
    <Box
      sx={{
        border: "1px solid grey",
        margin: 2,
        marginTop: 0,
        overflowX: "auto",
        borderRadius: 2,
        backgroundColor: "none",
      }}
    >
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              <TableCell colSpan={2} sx={{ paddingY: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 45,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {t("constraints")}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 45,
                    }}
                  >
                    <TableAddButton
                      text={t("select_all")}
                      handleClick={handleAddAllConstraints}
                      showIcon={false}
                    />
                    <TableAddButton
                      text={t("select_none")}
                      handleClick={handleRemoveAllConstraints}
                      showIcon={false}
                    />
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {constraints.map((constraint) => (
              <TableRow
                key={constraint.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Checkbox
                    checked={schedule.constraintBuildIds.includes(
                      constraint.id
                    )}
                    onChange={() =>
                      handleUpdateScheduleConstraintIds(constraint.id)
                    }
                  />
                </TableCell>
                <TableCell component="th" scope="row">
                  <Typography
                    variant="subtitle2"
                    align="left"
                    color={
                      constraint.active
                        ? ConstraintColorActiveText
                        : ConstraintColorInactiveText
                    }
                  >
                    {constraint.text}
                  </Typography>
                  {constraint.missingProperties.length > 0 && (
                    <div
                      className="field-name"
                      style={{
                        fontSize: "10px",
                        fontStyle: "italic",
                        color: ConstraintColorInactiveText,
                      }}
                    >
                      {"No " +
                        constraint.missingProperties
                          .flatMap((mp) => mp.propertyValues)
                          .join(", ") +
                        " property"}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
