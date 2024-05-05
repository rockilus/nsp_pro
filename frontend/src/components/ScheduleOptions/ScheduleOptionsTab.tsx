import React from "react";
// MUI
import Box from "@mui/material/Box";
// Components
import CoverageSelector from "./CoverageSelector";
import ScheduleSelector from "./ScheduleSelector";
import ConstraintSelector from "./ConstraintSelector";
// Types
import { CoverageSelectorT } from "./types";
import { TeamT } from "../../containers/types";
import { CoverageT } from "../Coverage/types";
import { ScheduleT } from "../Schedule/types";
import { ConstraintT } from "../Constraint/types";

interface Props {
  team: TeamT;
  schedule: ScheduleT | null;
  coverageSelectors: CoverageSelectorT[];
  coverages: CoverageT[];
  constraints: ConstraintT[];
}

export default function ScheduleOptionsTab({
  team,
  schedule,
  coverageSelectors,
  coverages,
  constraints,
}: Props) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <ScheduleSelector team={team} schedule={schedule} />
      {schedule && (
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
          <CoverageSelector
            team={team}
            schedule={schedule}
            coverageSelectors={coverageSelectors}
            coverages={coverages}
          />
          <ConstraintSelector schedule={schedule} constraints={constraints} />
        </Box>
      )}
    </Box>
  );
}
