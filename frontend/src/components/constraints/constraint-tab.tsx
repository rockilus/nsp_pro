import React, { useState, useEffect } from "react";
// Components
import ConstraintList from "./constraint-list";
import NewConstraint from "./new-constraint";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// Actions
import {
  getConstraintsTabData,
  addConstraint,
  updateConstraint,
  deleteConstraint,
} from "../../app/lib/constraint";
// Styles
import "../../styles/tab-container-styles.css";
// Types
import { ConstraintT, TemplateT } from "../../types/constraint";

export default function ConstraintTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
      setIsLoading(true);
      if (selectedTeamId) {
        const {
          templates: fetchedTemplates,
          constraints: fetchedConstraints,
        }: { templates: TemplateT[]; constraints: ConstraintT[] } =
          await getConstraintsTabData(selectedTeamId);
        setTemplates(fetchedTemplates);
        setConstraints(fetchedConstraints);
      }
      setIsLoading(false);
    };
    fetchConstraintsTabData();
  }, [selectedTeamId]);

  return (
    <div className="tab-container">
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={3} />
      ) : (
        selectedTeamId && (
          <div>
            {addingConstraint && (
              <div>
                <NewConstraint
                  lng={lng}
                  selectedTeamId={selectedTeamId}
                  templates={templates}
                  handleCloseAddConstraint={handleCloseAddConstraint}
                  handleAddConstraint={handleAddConstraint}
                  handleUpdateConstraint={handleUpdateConstraint}
                />
                <div className="divider" />
              </div>
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
          </div>
        )
      )}
    </div>
  );
}
