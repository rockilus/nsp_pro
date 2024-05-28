import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
// Stores
import { useCoverageStore } from "../../stores/coverageStore";
// Types
import { ShiftDemandT } from "./types";
import { ShiftT } from "../Shift/types";
// Constants
import { emptyShift } from "../../utils/emptyObjects";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  shiftDemand: ShiftDemandT;
  shifts: ShiftT[];
  handleClose: () => void;
}

export default function ShiftDemandPanel({
  team,
  shiftDemand,
  shifts,
  handleClose,
}: Props) {
  const { t } = useTranslation();

  const [SDState, setSDState] = useState<ShiftDemandT>(shiftDemand);

  const addShiftDemand = useCoverageStore((state) => state.addShiftDemand);
  const updateShiftDemand = useCoverageStore(
    (state) => state.updateShiftDemand
  );
  const deleteShiftDemand = useCoverageStore(
    (state) => state.deleteShiftDemand
  );

  const handleSaveSD = () => {
    if (SDState.id === "") {
      addShiftDemand(SDState, team.id);
    } else {
      updateShiftDemand(SDState, team.id);
    }
    handleClose();
  };

  const handleDeleteSD = () => {
    if (SDState.id !== "") {
      deleteShiftDemand(SDState.coverageId, SDState.id, team.id);
    }
    handleClose();
  };

  const selectShift = () => {
    return (
      <Box sx={{ marginLeft: 1, marginRight: 2, width: "100%" }}>
        <FormControl fullWidth>
          <Select
            value={SDState.shift.id}
            label={t("common.shift")}
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
        <Typography>{t("coverage.shift_demand")}</Typography>
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
            {t("common.delete")}
          </Button>
        )}
        <Button
          variant="contained"
          color="primary"
          sx={{ marginRight: 2 }}
          onClick={handleSaveSD}
        >
          {t("common.save")}
        </Button>
      </Box>
    </Box>
  );
}
