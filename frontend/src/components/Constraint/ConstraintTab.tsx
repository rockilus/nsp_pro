import React, { useEffect } from "react";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import ConstraintList from "./ConstraintList";
import NewConstraint from "./NewConstraint";
// Stores
import { useConstraintStore } from "../../stores/constraintStore";
import { useConstraintTemplateStore } from "../../stores/constraintTemplateStore";
// Types
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
}

export default function ConstraintTab({ team }: Props) {
  const constraints = useConstraintStore((state) => state.constraints);
  const fetchConstraints = useConstraintStore(
    (state) => state.fetchConstraints
  );

  const constraintTemplates = useConstraintTemplateStore(
    (state) => state.constraintTemplates
  );
  const fetchConstraintTemplates = useConstraintTemplateStore(
    (state) => state.fetchConstraintTemplates
  );

  useEffect(() => {
    fetchConstraints(team.id);
    fetchConstraintTemplates(team.id);
  }, [fetchConstraints, fetchConstraintTemplates, team.id]);

  return (
    <Box style={{ width: "100%", backgroundColor: "white" }}>
      <Typography variant="h4" align="left" color="black">
        Constraints Configuration
      </Typography>
      <NewConstraint team={team} constraintTemplates={constraintTemplates} />
      <ConstraintList
        team={team}
        constraints={constraints}
        constraintTemplates={constraintTemplates}
      />
    </Box>
  );
}
