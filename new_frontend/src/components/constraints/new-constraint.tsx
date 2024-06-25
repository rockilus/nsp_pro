import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
// Components
import ConstraintEdit from "./constraint-edit";
import TemplateList from "./template-list";
// Types
import { TemplateT, ConstraintT } from "../../types/constraint";

export default function NewConstraint({
  lng,
  selectedTeamId,
  constraintTemplates,
  handleCloseAddConstraint,
  handleAddConstraint,
  handleUpdateConstraint,
}: {
  lng: string;
  selectedTeamId: string;
  constraintTemplates: TemplateT[];
  handleCloseAddConstraint: () => void;
  handleAddConstraint: (constraint: ConstraintT) => void;
  handleUpdateConstraint: (updatedConstraint: ConstraintT) => void;
}) {
  const { t } = useTranslation();

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
          {t("constraint.new_constraint")}
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
            lng={lng}
            constraint={{
              id: "",
              teamId: selectedTeamId,
              constraintType: selectedTemplate.constraintType,
              templateId: selectedTemplate.id,
              language: selectedTemplate.language,
              blocks: [],
              text: "",
              hard: true,
              priority: "medium",
              active: true,
              missingProperties: [],
            }}
            constraintTemplate={selectedTemplate}
            handleAddConstraint={handleAddConstraint}
            handleUpdateConstraint={handleUpdateConstraint}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ fontStyle: "italic", color: "grey" }}
          >
            {t("constraint.select_template")}
          </Typography>
        )}
      </Box>
      <TemplateList
        lng={lng}
        constraintTemplates={constraintTemplates}
        selectedTemplate={selectedTemplate}
        handleSelectedTemplate={handleSelectedTemplate}
      />
    </Box>
  );
}
