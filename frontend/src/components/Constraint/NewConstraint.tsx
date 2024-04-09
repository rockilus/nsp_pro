import React, { useState } from "react";
// MUI
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
// Components
import ConstraintEdit from "./ConstraintEdit";
import TemplateList from "./TemplateList";
// Types
import { TemplateT } from "./types";
import { TeamT } from "../../containers/types";

interface Props {
  team: TeamT;
  constraintTemplates: TemplateT[];
  handleCloseAddConstraint: () => void;
}

export default function NewConstraint({
  team,
  constraintTemplates,
  handleCloseAddConstraint,
}: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateT | null>(
    null
  );

  const handleSelectedTemplate = (ct: TemplateT) => {
    setSelectedTemplate(ct);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
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
          justifyContent: "space-between",
          minHeight: 45,
          paddingX: 1,
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
          Add constraint
        </Typography>
        <IconButton onClick={handleCloseAddConstraint}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box
        sx={{
          padding: 1,
          minHeight: 65,
          display: "flex",
          alignItems: "center",
        }}
      >
        {selectedTemplate ? (
          <ConstraintEdit
            constraint={{
              id: "",
              teamId: team.id,
              constraintType: selectedTemplate.constraintType,
              templateId: selectedTemplate.id,
              blocks: [],
              text: "",
              hard: true,
              priority: "medium",
              active: true,
              missingProperties: [],
            }}
            constraintTemplate={selectedTemplate}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ fontStyle: "italic", color: "grey" }}
          >
            Select constraint template in list below.
          </Typography>
        )}
      </Box>
      <TemplateList
        constraintTemplates={constraintTemplates}
        selectedTemplate={selectedTemplate}
        handleSelectedTemplate={handleSelectedTemplate}
      />
    </Box>
  );
}
