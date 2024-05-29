import * as React from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
// Components
import ConstraintListItem from "./ConstraintListItem";
import TableAddButton from "../SharedComponents/TableAddButton";
// Types
import { ConstraintT, TemplateT } from "./types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  constraints: ConstraintT[];
  constraintTemplates: TemplateT[];
  handleOpenAddConstraint: () => void;
}

export default function ConstraintList({
  team,
  constraints,
  constraintTemplates,
  handleOpenAddConstraint,
}: Props) {
  const { t } = useTranslation();

  const findTemplateById = (id: string): TemplateT | null => {
    const template = constraintTemplates.find((template) => template.id === id);
    return template ? template : null;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        backgroundColor: "grey.100",
        minWidth: 200,
        border: "1px solid grey",
        borderRadius: 2,
        margin: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingX: 1,
          borderBottom: "1px solid lightgrey",
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            alignItems: "center",
          }}
        >
          <Typography
            variant="subtitle1"
            align="left"
            sx={{ fontWeight: "bold" }}
          >
            {t("constraint.constraints")}
          </Typography>
          <TableAddButton
            text={t("common.constraint")}
            handleClick={handleOpenAddConstraint}
          />
        </Box>
      </Box>
      <Grid
        container
        spacing={0}
        sx={{ backgroundColor: "white", borderRadius: 2 }}
      >
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
