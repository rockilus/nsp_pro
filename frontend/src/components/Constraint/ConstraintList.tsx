import * as React from "react";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Grid from "@mui/material/Grid";

import ConstraintListItem from "./ConstraintListItem";
import { ConstraintT, TemplateT } from "./types";

interface Props {
  constraints: ConstraintT[];
  constraintTemplates: TemplateT[];
}

export default function ConstraintList({
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
            constraint={constraint}
            constraintTemplate={findTemplateById(constraint.templateId)}
          />
        ))}
      </Grid>
    </Box>
  );
}
