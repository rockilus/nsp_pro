import React, { useState, useEffect } from "react";
// MUI
import Box from "@mui/material/Box";
// Components
import ConstraintList from "./constraint-list";
import NewConstraint from "./new-constraint";
// Actions
import {
  getConstraintsTabData,
  addConstraint,
  updateConstraint,
  deleteConstraint,
} from "../../app/lib/constraint";
// Types
import { ConstraintT, TemplateT } from "../../types/constraint";

export default function ConstraintTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const [templates, setTemplates] = useState<TemplateT[]>([]);
  const [constraints, setConstraints] = useState<ConstraintT[]>([]);
  const [addingConstraint, setAddingConstraint] = useState<boolean>(false);

  const handleOpenAddConstraint = () => {
    setAddingConstraint(true);
  };

  const handleCloseAddConstraint = () => {
    setAddingConstraint(false);
  };

  //////////////////////////
  // Constraint Actions
  //////////////////////////

  const handleAddConstraint = async (constraint: ConstraintT) => {
    const newConstraint = await addConstraint(constraint);
    setConstraints([...constraints, newConstraint]);
  };

  const handleUpdateConstraint = async (updatedConstraint: ConstraintT) => {
    const newConstraint = await updateConstraint(updatedConstraint);
    setConstraints((prevConstraints) =>
      prevConstraints.map((constraint) =>
        constraint.id === newConstraint.id ? newConstraint : constraint
      )
    );
  };

  const handleDeleteConstraint = async (constraintId: string) => {
    if (!selectedTeamId) {
      throw new Error("Team not selected");
    }
    await deleteConstraint(constraintId, selectedTeamId);
    setConstraints((prevConstraints) =>
      prevConstraints.filter((constraint) => constraint.id !== constraintId)
    );
  };

  useEffect(() => {
    const fetchConstraintsTabData = async () => {
      if (selectedTeamId) {
        const {
          templates: fetchedTemplates,
          constraints: fetchedConstraints,
        }: { templates: TemplateT[]; constraints: ConstraintT[] } =
          await getConstraintsTabData(selectedTeamId);
        setTemplates(fetchedTemplates);
        setConstraints(fetchedConstraints);
      }
    };
    fetchConstraintsTabData();
  }, [selectedTeamId]);

  return (
    selectedTeamId && (
      <Box style={{ width: "100%", backgroundColor: "white" }}>
        {addingConstraint && (
          <NewConstraint
            lng={lng}
            selectedTeamId={selectedTeamId}
            templates={templates}
            handleCloseAddConstraint={handleCloseAddConstraint}
            handleAddConstraint={handleAddConstraint}
            handleUpdateConstraint={handleUpdateConstraint}
          />
        )}
        <ConstraintList
          lng={lng}
          constraints={constraints}
          constraintTemplates={templates}
          handleOpenAddConstraint={handleOpenAddConstraint}
          handleAddConstraint={handleAddConstraint}
          handleUpdateConstraint={handleUpdateConstraint}
          handleDeleteConstraint={handleDeleteConstraint}
        />
      </Box>
    )
  );
}
