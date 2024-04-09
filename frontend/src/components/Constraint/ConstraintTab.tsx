import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
// Components
import ConstraintList from "./ConstraintList";
import NewConstraint from "./NewConstraint";
// Types
import { TeamT } from "../../containers/types";
import { ConstraintT, TemplateT } from "./types";

interface Props {
  team: TeamT;
  constraints: ConstraintT[];
  constraintTemplates: TemplateT[];
}

export default function ConstraintTab({
  team,
  constraints,
  constraintTemplates,
}: Props) {
  const [addingConstraint, setAddingConstraint] = useState<boolean>(false);

  const handleOpenAddConstraint = () => {
    setAddingConstraint(true);
  };

  const handleCloseAddConstraint = () => {
    setAddingConstraint(false);
  };

  return (
    <Box style={{ width: "100%", backgroundColor: "white" }}>
      {addingConstraint && (
        <NewConstraint
          team={team}
          constraintTemplates={constraintTemplates}
          handleCloseAddConstraint={handleCloseAddConstraint}
        />
      )}
      <ConstraintList
        team={team}
        constraints={constraints}
        constraintTemplates={constraintTemplates}
        handleOpenAddConstraint={handleOpenAddConstraint}
      />
    </Box>
  );
}
