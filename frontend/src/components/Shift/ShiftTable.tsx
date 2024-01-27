import React, { useState } from "react";

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

import ShiftPropertyCell from "./ShiftPropertyCell";
import ShiftDimensionCell from "./ShiftDimensionCell";
import AddShiftDimensionDrawer from "./AddShiftDimensionDrawer";
import ShiftFieldCell from "./ShiftFieldCell";
import { ShiftDimensionT, ShiftT } from "./types";
import { useShiftStore } from "../../stores/shiftStore";
import { DefaultProperties } from "../../utils/constants";

interface Props {
  shiftDimensions: ShiftDimensionT[];
  shifts: ShiftT[];
  defaultShiftFields: string[];
}

export default function ShiftTable({
  shiftDimensions,
  shifts,
  defaultShiftFields,
}: Props) {
  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addShift = useShiftStore((state) => state.addShift);
  const deleteShift = useShiftStore((state) => state.deleteShift);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <>
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {defaultShiftFields.map((field, index) => (
                <TableCell key={index}>{field}</TableCell>
              ))}
              {shiftDimensions.map((sd, sdIndex) => (
                <ShiftDimensionCell key={sdIndex} shiftDimension={sd} />
              ))}
              <TableCell>
                <Button onClick={toggleDrawer}>
                  <AddIcon />
                </Button>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift, shiftIndex) => (
              <TableRow
                key={shiftIndex}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
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
                    // )
                  );
                })}
                <TableCell component="th" scope="row">
                  <Box sx={{ display: "flex" }}>
                    <Button onClick={() => deleteShift(shift.id)}>
                      <DeleteIcon />
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={shiftDimensions.length}>
                <Button onClick={addShift}>
                  <AddIcon />
                  New
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <AddShiftDimensionDrawer
        drawerOpen={drawerOpen}
        toggleDrawer={toggleDrawer}
      />
    </>
  );
}
