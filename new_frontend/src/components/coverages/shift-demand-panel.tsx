import React, { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import WorkIcon from "@mui/icons-material/Work";
// Types
import { ShiftDemandT } from "../../types/coverage";
import { ShiftT } from "../../types/shift";

export default function ShiftDemandPanel({
  lng,
  shiftDemand,
  shifts,
  handleClose,
  handleAddShiftDemand,
  handleUpdateShiftDemand,
  handleDeleteShiftDemand,
}: {
  lng: string;
  shiftDemand: ShiftDemandT;
  shifts: ShiftT[];
  handleClose: () => void;
  handleAddShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleUpdateShiftDemand: (shiftDemand: ShiftDemandT) => void;
  handleDeleteShiftDemand: (coverageId: string, shiftDemandId: string) => void;
}) {
  const { t } = useTranslation(lng, "coverage-page");

  const [SDState, setSDState] = useState<ShiftDemandT>(shiftDemand);

  const emptyShift = {
    teamId: "",
    id: "",
    name: "",
    startTime: dayjs(),
    endTime: dayjs(),
    staffing: 0,
    color: "",
    isTimeOff: false,
    shiftProperties: [],
  };

  const handleSaveSD = async () => {
    if (SDState.id === "") {
      await handleAddShiftDemand(SDState);
    } else {
      await handleUpdateShiftDemand(SDState);
    }
    handleClose();
  };

  const handleDeleteSD = async () => {
    if (SDState.id !== "") {
      await handleDeleteShiftDemand(SDState.coverageId, SDState.id);
    }
    handleClose();
  };

  const selectShift = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={SDState.shift.id}
            label={t("shift")}
            onChange={(e) =>
              setSDState({
                ...SDState,
                shift:
                  shifts.find((s) => s.id === (e.target.value as string)) ||
                  emptyShift,
              })
            }
          >
            {shifts.map((shift) => (
              <MenuItem key={shift.id} value={shift.id}>
                {shift.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginLeft: 2,
          marginRight: 2,
          marginBottom: 1,
        }}
      >
        <Typography>{t("shift_demand")}</Typography>
        <IconButton onClick={handleClose} sx={{ marginRight: 2 }}>
          <CloseIcon color="disabled" />
        </IconButton>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          marginBottom: 1,
        }}
      >
        <WorkIcon sx={{ marginLeft: 2, marginRight: 1 }} />
        {selectShift()}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          width: "100%",
        }}
      >
        {shiftDemand.id !== "" && (
          <Button
            variant="contained"
            color="primary"
            sx={{ marginRight: 2 }}
            onClick={handleDeleteSD}
          >
            {t("delete")}
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          sx={{ marginRight: 2 }}
          onClick={handleSaveSD}
        >
          {t("save")}
        </Button>
      </Box>
    </Box>
  );
}
