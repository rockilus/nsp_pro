import * as React from "react";
// MUI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
// Components
import ConstraintListItem from "./ConstraintListItem";
// Types
import { ConstraintT, TemplateT } from "./types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  constraints: ConstraintT[];
  constraintTemplates: TemplateT[];
}

export default function ConstraintList({
  team,
  constraints,
  constraintTemplates,
}: Props) {
  const findTemplateById = (id: string): TemplateT | null => {
    const template = constraintTemplates.find((template) => template.id === id);
    return template ? template : null;
  };

  return (
    <Box sx={{ margin: 1 }}>
      <Grid container spacing={0}>
        {constraints.map((constraint) => (
          <ConstraintListItem
            key={constraint.id}
            team={team}
            constraint={constraint}
            constraintTemplate={findTemplateById(constraint.templateId)}
          />
        ))}
      </Grid>
    </Box>
  );
}
