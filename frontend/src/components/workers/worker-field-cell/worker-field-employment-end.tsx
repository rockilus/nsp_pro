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
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TableCell from "@mui/material/TableCell";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// Types
import { WorkerT } from "../../../types/worker";

dayjs.extend(utc);

export default function WorkerFieldEmploymentEnd({
  lng,
  worker,
  editing,
  setEditing,
  handleUpdateWorker,
}: {
  lng: string;
  worker: WorkerT;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<{}>>;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const cellRef = useRef<HTMLTableCellElement>(null);
  const [valueState, setValueState] = useState<dayjs.Dayjs | null>(
    worker.employmentEndDate
  );
  const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false);

  const handlePermanentChange = () => {
    if (valueState) {
      setValueState(null);
    } else {
      setValueState(dayjs.utc());
    }
  };

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
    (newDate: dayjs.Dayjs | null) => {
      if (!newDate) {
        handleUpdateWorker({
          ...worker,
          employmentEndDate: null,
        });
      } else if (!newDate.isSame(worker.employmentEndDate)) {
        handleUpdateWorker({
          ...worker,
          employmentEndDate: newDate,
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
        setValueState(worker.employmentEndDate);
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
        <div ref={cellRef}>
          <DatePicker
            className="custom-date-picker"
            disabled={valueState ? false : true}
            value={valueState}
            onChange={(newValue) => handleUpdateState(newValue)}
            onOpen={() => setDatePickerOpen(true)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={valueState ? false : true}
                onChange={handlePermanentChange}
              />
            }
            label={t("permanent")}
          />
        </div>
      ) : (
        <div onClick={() => setEditing({ [worker.id]: "employmentEndDate" })}>
          <span>
            {worker.employmentEndDate
              ? worker.employmentEndDate.format("DD/MM/YYYY")
              : t("permanent")}
          </span>
        </div>
      )}
    </TableCell>
  );
}
