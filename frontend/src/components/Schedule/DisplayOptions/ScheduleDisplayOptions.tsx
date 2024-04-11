import React from "react";
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
import TableRowScheduleWIP from "../ScheduleOptions/TableRowScheduleWIP";

interface Props {
  selectedDisplay: string;
  displayCBs: boolean;
  setSelectedDisplay: (newSelectedDisplay: string) => void;
  switchDisplayCBs: () => void;
}

export default function ScheduleDisplayOptions({
  selectedDisplay,
  displayCBs,
  setSelectedDisplay,
  switchDisplayCBs,
}: Props) {
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
          Display
        </Typography>
      </Box>
      <TableContainer
        component={Paper}
        style={{ width: "100%", borderRadius: "0 0 8px 8px" }}
      >
        <Table aria-label="simple table">
          <TableBody>
            <TableRowScheduleWIP
              name="View"
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
                    Shift
                  </ToggleButton>
                  <ToggleButton
                    value="worker"
                    sx={{
                      textTransform: "none",
                      height: "25px",
                      fontSize: "0.75rem",
                    }}
                  >
                    Worker
                  </ToggleButton>
                </ToggleButtonGroup>
              }
            />
            <TableRowScheduleWIP
              name="Breaches"
              content={
                <Switch
                  checked={displayCBs}
                  onChange={switchDisplayCBs}
                  inputProps={{ "aria-label": "controlled" }}
                />
              }
            />
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
