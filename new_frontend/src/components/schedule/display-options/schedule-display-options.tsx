import React from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
// Components
import TableRowScheduleWIP from "../schedule-options/table-row-schedule-wip";

export default function ScheduleDisplayOptions({
  lng,
  selectedDisplay,
  displayCBs,
  setSelectedDisplay,
  switchDisplayCBs,
}: {
  lng: string;
  selectedDisplay: string;
  displayCBs: boolean;
  setSelectedDisplay: (newSelectedDisplay: string) => void;
  switchDisplayCBs: () => void;
}) {
  const { t } = useTranslation();

  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newAlignment: string
  ) => {
    if (newAlignment !== null) {
      setSelectedDisplay(newAlignment);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        border: "1px solid grey",
        borderRadius: 2,
        marginTop: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingLeft: 1,
          borderBottom: "1px solid lightgrey",
          backgroundColor: "grey.100",
          borderRadius: "8px 8px 0 0",
        }}
      >
        <Typography
          variant="subtitle1"
          align="left"
          sx={{ fontWeight: "bold" }}
        >
          {t("common.display")}
        </Typography>
      </Box>
      <TableContainer
        component={Paper}
        style={{ width: "100%", borderRadius: "0 0 8px 8px" }}
      >
        <Table aria-label="simple table">
          <TableBody>
            <TableRowScheduleWIP
              name={t("common.view")}
              content={
                <ToggleButtonGroup
                  color="primary"
                  value={selectedDisplay}
                  exclusive
                  onChange={handleChange}
                  aria-label="Platform"
                >
                  <ToggleButton
                    value="shift"
                    sx={{
                      textTransform: "none",
                      height: "25px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {t("common.shift")}
                  </ToggleButton>
                  <ToggleButton
                    value="worker"
                    sx={{
                      textTransform: "none",
                      height: "25px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {t("common.worker")}
                  </ToggleButton>
                </ToggleButtonGroup>
              }
            />
            <TableRowScheduleWIP
              name={t("schedule.breaches")}
              content={
                <Switch
                  checked={displayCBs}
                  onChange={switchDisplayCBs}
                  inputProps={{ "aria-label": "controlled" }}
                  size="small"
                />
              }
            />
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
