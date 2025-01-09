import React, {
  Dispatch,
  SetStateAction,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// MUI
import TableCell from "@mui/material/TableCell";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Types
import { WorkerT } from "../../../types/worker";

dayjs.extend(utc);

export default function WorkerFieldEmploymentStart({
  worker,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  worker: WorkerT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
}) {
  const cellRef = useRef<HTMLTableCellElement>(null);
  const [valueState, setValueState] = useState<dayjs.Dayjs>(
    worker.employmentStartDate
  );
  const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false);

  const handleUpdateState = (newValue: dayjs.Dayjs | null) => {
    if (!newValue) return;
    const newDate = dayjs.utc(newValue);
    setValueState(newDate);
    if (datePickerOpen) {
      handleEditConfirm(newDate);
      setDatePickerOpen(false);
    }
  };

  const handleEditConfirm = useCallback(
    (newDate: dayjs.Dayjs) => {
      if (!newDate.isSame(worker.employmentStartDate)) {
        handleUpdateWorker({
          ...worker,
          employmentStartDate: newDate,
        });
      }
      setEditing({});
    },
    [worker, handleUpdateWorker, setEditing]
  );

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (!editing) return;
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        if (datePickerOpen) {
          return;
        } else {
          handleEditConfirm(valueState);
        }
      }
    },
    [cellRef, valueState, datePickerOpen, editing, handleEditConfirm]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!editing) return;
      if (event.key === "Enter") {
        handleEditConfirm(valueState);
      } else if (event.key === "Escape") {
        setValueState(worker.employmentStartDate);
        setDatePickerOpen(false);
        setEditing({});
      }
    },
    [worker, valueState, editing, handleEditConfirm, setEditing]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown, editing]);

  return (
    <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
      {editing ? (
        <div>
          <DatePicker
            className="custom-date-picker"
            value={valueState}
            ref={cellRef}
            onChange={(newValue) => handleUpdateState(newValue)}
            onOpen={() => setDatePickerOpen(true)}
          />
        </div>
      ) : (
        <div onClick={() => setEditing({ [worker.id]: "employmentStartDate" })}>
          <span>{worker.employmentStartDate.format("DD/MM/YYYY")}</span>
        </div>
      )}
    </TableCell>
  );
}
