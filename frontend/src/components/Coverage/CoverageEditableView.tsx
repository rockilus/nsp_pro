import AddCircleIcon from "@mui/icons-material/AddCircle";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";

import { useEffect, useState } from "react";
import { CoverageT, ShiftDemandT, ShiftT } from "./types";

type CoverageEditableViewProps = {
  coverage: CoverageT;
  shifts: ShiftT[];
  onChange: (updatedCoverage: CoverageT) => void;
};

const CoverageEditableView: React.FC<CoverageEditableViewProps> = ({
  coverage,
  shifts,
  onChange,
}) => {
  // Local state to manage temporary changes before saving
  const [localCoverage, setLocalCoverage] = useState<CoverageT>(coverage);
  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const columns = ["", ...weekDays];

  // Effect to update local state when the coverage prop changes
  useEffect(() => {
    setLocalCoverage(coverage);
  }, [coverage]);

  // handlers
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target;
    if (type === "date") {
      setLocalCoverage((prev) => ({ ...prev, [name]: new Date(value) }));
    } else {
      setLocalCoverage((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddShiftDemand = (dayIndex: number, shiftId: string) => {
    setLocalCoverage((prev) => {
      const existingShiftDemand = prev.shiftDemands.find(
        (sd) => sd.dayIndex === dayIndex && sd.shiftId === shiftId
      );
      if (existingShiftDemand) {
        // Increment quantity if shift demand already exists
        return {
          ...prev,
          shiftDemands: prev.shiftDemands.map((sd) =>
            sd.dayIndex === dayIndex && sd.shiftId === shiftId
              ? { ...sd, quantity: sd.quantity + 1 }
              : sd
          ),
        };
      } else {
        // Add new shift demand if it doesn't exist
        const newShiftDemand: ShiftDemandT = {
          dayIndex,
          shiftId,
          quantity: 1,
        };
        return {
          ...prev,
          shiftDemands: [...prev.shiftDemands, newShiftDemand],
        };
      }
    });
  };

  const handleRemoveShiftDemand = (dayIndex: number, shiftId: string) => {
    setLocalCoverage((prev) => {
      const existingShiftDemand = prev.shiftDemands.find(
        (sd) => sd.dayIndex === dayIndex && sd.shiftId === shiftId
      );
      if (existingShiftDemand && existingShiftDemand.quantity > 1) {
        // Decrement quantity if it's more than 1
        return {
          ...prev,
          shiftDemands: prev.shiftDemands.map((sd) =>
            sd.dayIndex === dayIndex && sd.shiftId === shiftId
              ? { ...sd, quantity: sd.quantity - 1 }
              : sd
          ),
        };
      } else {
        // Remove the shift demand entirely if quantity is 1 or doesn't exist
        return {
          ...prev,
          shiftDemands: prev.shiftDemands.filter(
            (sd) => !(sd.dayIndex === dayIndex && sd.shiftId === shiftId)
          ),
        };
      }
    });
  };

  const handleSaveChanges = () => {
    onChange(localCoverage);
  };

  return (
    <div>
      <TextField
        label="Name"
        name="name"
        value={localCoverage.name}
        onChange={handleInputChange}
      />
      <TableContainer component={Paper} style={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex} component="th" scope="row">
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow
                key={shift.id}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell key={shift.id} component="th" scope="row">
                  {shift.name}
                </TableCell>
                {Array.from({ length: weekDays.length }).map((_, dayIndex) => {
                  const demand = localCoverage.shiftDemands.find(
                    (sd) => sd.dayIndex === dayIndex && sd.shiftId === shift.id
                  ) || { quantity: 0 };
                  return (
                    <TableCell key={dayIndex} component="th" scope="row">
                      <Chip
                        label={demand.quantity}
                        size="small"
                        variant="outlined"
                        style={{ marginRight: "8px" }}
                      />
                      <IconButton
                        onClick={() =>
                          handleRemoveShiftDemand(dayIndex, shift.id)
                        }
                        size="small"
                      >
                        <RemoveCircleIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleAddShiftDemand(dayIndex, shift.id)}
                        size="small"
                      >
                        <AddCircleIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button onClick={handleSaveChanges}>Save Changes</Button>
    </div>
  );
};

export default CoverageEditableView;
