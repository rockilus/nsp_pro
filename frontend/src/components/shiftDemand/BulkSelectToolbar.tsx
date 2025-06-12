import React from "react";
import {
  Box,
  Paper,
  Button,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Chip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CancelIcon from "@mui/icons-material/Cancel";
import { useTranslation } from "../../app/i18n/client";

interface BulkSelectToolbarProps {
  lng: string;
  selectedCellsCount: number;
  bulkValue: string;
  onBulkValueChange: (value: string) => void;
  onApplyBulkChange: () => void;
  onDeleteBulkSelection: () => void;
  onCancelBulkMode: () => void;
}

export function BulkSelectToolbar({
  lng,
  selectedCellsCount,
  bulkValue,
  onBulkValueChange,
  onApplyBulkChange,
  onDeleteBulkSelection,
  onCancelBulkMode,
}: BulkSelectToolbarProps) {
  const { t } = useTranslation(lng, "shift-demands");

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 2,
        width: "100%",
        margin: 0,
        padding: "3px 16px",
        backgroundColor: "primary.50",
        borderTop: "1px solid",
        // borderBottom: "1px solid",
        borderColor: "grey.100",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
        height="35px"
      >
        {/* Left side - Status */}
        <Box display="flex" alignItems="center" gap={2}>
          <Chip
            label={t("bulk_mode_active")}
            color="primary"
            variant="outlined"
            size="small"
          />
          <Typography variant="body2">
            {t("selected_cells", { count: selectedCellsCount })}
          </Typography>
        </Box>

        {/* Right side - Actions (only show if cells are selected) */}
        {selectedCellsCount > 0 && (
          <Box display="flex" alignItems="center" gap={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{t("set_value")}</InputLabel>
              <OutlinedInput
                type="number"
                value={bulkValue}
                onChange={(e) => onBulkValueChange(e.target.value)}
                inputProps={{ min: 0 }}
                label={t("set_value")}
                endAdornment={
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={onApplyBulkChange}
                      disabled={!bulkValue}
                    >
                      {t("apply")}
                    </Button>
                  </InputAdornment>
                }
              />
            </FormControl>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={onDeleteBulkSelection}
              size="small"
            >
              {t("delete")}
            </Button>
          </Box>
        )}

        {/* Cancel button - always visible */}
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={onCancelBulkMode}
          size="small"
        >
          {t("cancel")}
        </Button>
      </Box>
    </Paper>
  );
}
