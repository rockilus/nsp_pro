import React, { useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Components
import NewShiftDimensionForm from "./NewShiftDimensionForm";
import PopoverRHS from "../SharedComponents/PopoverRHS";
import ShiftDimensionCell from "./ShiftDimensionCell";
import ShiftFieldCell from "./ShiftFieldCell";
import ShiftPropertyCell from "./ShiftPropertyCell";
import TableAddButton from "../SharedComponents/TableAddButton";
import Typography from "@mui/material/Typography";
// Stores
import { useShiftStore } from "../../stores/shiftStore";
// Types
import { ShiftDimensionT, ShiftT } from "./types";
import { TeamT } from "../../containers/types";
// Constants
import { DefaultProperties } from "../../utils/constants";

dayjs.extend(utc);

interface Props {
  team: TeamT;
  isRest: boolean;
  shiftDimensions: ShiftDimensionT[];
  shifts: ShiftT[];
  defaultShiftFields: string[];
}

export default function ShiftTable({
  team,
  isRest,
  shiftDimensions,
  shifts,
  defaultShiftFields,
}: Props) {
  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  const addShift = useShiftStore((state) => state.addShift);
  const deleteShift = useShiftStore((state) => state.deleteShift);

  const roundTime = (dt: dayjs.Dayjs): dayjs.Dayjs => {
    let minutes = Math.floor(dt.minute() / 15) * 15;
    return dt.minute(minutes).second(0).millisecond(0);
  };

  const handleAddShift = () => {
    addShift({
      id: "",
      teamId: team.id,
      name: "",
      startTime: roundTime(dayjs.utc()),
      endTime: roundTime(dayjs.utc()),
      isTimeOff: isRest,
      staffing: 1,
      color: "grey",
      shiftProperties: [],
    });
  };

  return (
    <>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              <TableCell
                colSpan={defaultShiftFields.length + shiftDimensions.length + 1}
                sx={{ paddingY: 0 }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  width="100%"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center" minHeight={45}>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {isRest ? "Rest shifts" : "Shifts"}
                    </Typography>
                  </Box>
                  <PopoverRHS
                    title={"New property"}
                    buttonContent={<TableAddButton text="Add property" />}
                    content={
                      <NewShiftDimensionForm
                        isRest={isRest}
                        setOpenParent={setPopoverRhsOpen}
                      />
                    }
                    open={popoverRhsOpen}
                    setOpen={setPopoverRhsOpen}
                  />
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              {defaultShiftFields.map((field, index) => (
                <TableCell key={index} sx={{ paddingY: 0, fontWeight: "bold" }}>
                  <Box
                    sx={{
                      minHeight: 45,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {field}
                  </Box>
                </TableCell>
              ))}
              {shiftDimensions.map((sd, sdIndex) => (
                <ShiftDimensionCell key={sdIndex} shiftDimension={sd} />
              ))}
              <TableCell sx={{ padding: 0, width: 110 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift, shiftIndex) => (
              <TableRow
                key={shiftIndex}
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                }}
              >
                {defaultShiftFields.map((field, index) => (
                  <ShiftFieldCell
                    key={index}
                    shift={shift}
                    shiftField={field}
                    editing={bodyEditing}
                    setEditing={setBodyEditing}
                  />
                ))}
                {shiftDimensions.map((sd, sdIndex) => {
                  const shiftProperty = shift.shiftProperties.find(
                    (sp) => sp.shiftDimensionId === sd.id
                  );
                  return (
                    <ShiftPropertyCell
                      key={sdIndex}
                      team={team}
                      shiftProperty={
                        shiftProperty
                          ? shiftProperty
                          : {
                              id: "",
                              shiftId: shift.id,
                              shiftDimensionId: sd.id,
                              value: DefaultProperties[sd.entryType],
                            }
                      }
                      shiftDimension={sd}
                      editing={bodyEditing[shift.id] === sd.id}
                      setEditing={setBodyEditing}
                    />
                  );
                })}
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  <Box sx={{ display: "flex" }}>
                    <Button onClick={() => deleteShift(shift.id, team.id)}>
                      <DeleteIcon />
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: "grey.100" }}>
              <TableCell
                colSpan={defaultShiftFields.length + shiftDimensions.length + 1}
                sx={{ paddingY: 0 }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", minHeight: 45 }}
                >
                  <TableAddButton
                    text={isRest ? "Add rest" : "Add shift"}
                    handleClick={handleAddShift}
                  />
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
