import React, { useState, useEffect, useCallback } from "react";
// Components
import ConstraintList from "./constraint-list/constraint-list";
import NewConstraint from "./edit-constraint/new-constraint";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// New hooks (authenticated)
import {
  useGetConstraintsTabData,
  useAddConstraint,
  useUpdateConstraint,
  useDeleteConstraint,
} from "../../hooks/useConstraint";
// Styles
import "../../styles/tab-container-styles.css";
// Types
import { ConstraintT, TemplateT } from "../../types/constraint";
import { WorkerT } from "../../types/worker";
import { ShiftT } from "../../types/shift";

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
  const [workers, setWorkers] = useState<WorkerT[]>([]);
  const [shifts, setShifts] = useState<ShiftT[]>([]);

  // Authenticated hooks
  const getConstraintsTabData = useGetConstraintsTabData();
  const addConstraint = useAddConstraint();
  const updateConstraint = useUpdateConstraint();
  const deleteConstraint = useDeleteConstraint();

  const handleOpenAddConstraint = () => {
    setAddingConstraint(true);
  };

  const handleCloseAddConstraint = () => {
    setAddingConstraint(false);
  };

  // Load data when team changes
  const loadConstraintsData = useCallback(async () => {
    if (!selectedTeamId) return;

    setIsLoading(true);
    try {
      const data = await getConstraintsTabData(selectedTeamId);
      setTemplates(data.templates);
      setConstraints(data.constraints);
      setWorkers(data.workers);
      setShifts(data.shifts);
    } catch (error) {
      console.error("Failed to load constraints data:", error);
      // TODO: Add error handling/notification
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId, getConstraintsTabData]);

  //////////////////////////
  // Constraint Actions
  //////////////////////////

  const handleAddConstraint = async (constraint: ConstraintT) => {
    try {
      const newConstraint = await addConstraint(constraint);
      setConstraints([...constraints, newConstraint]);
      setAddingConstraint(false);
    } catch (error) {
      console.error("Failed to add constraint:", error);
      // TODO: Add error handling/notification
    }
  };

  const handleUpdateConstraint = async (updatedConstraint: ConstraintT) => {
    try {
      const newConstraint = await updateConstraint(updatedConstraint);
      setConstraints((prevConstraints) =>
        prevConstraints.map((constraint) =>
          constraint.id === newConstraint.id ? newConstraint : constraint
        )
      );
      setAddingConstraint(false);
    } catch (error) {
      console.error("Failed to update constraint:", error);
      // TODO: Add error handling/notification
    }
  };

  const handleDeleteConstraint = async (constraintId: string) => {
    if (!selectedTeamId) return;

    try {
      await deleteConstraint(constraintId, selectedTeamId);
      setConstraints((prevConstraints) =>
        prevConstraints.filter((constraint) => constraint.id !== constraintId)
      );
    } catch (error) {
      console.error("Failed to delete constraint:", error);
      // TODO: Add error handling/notification
    }
  };

  // Load data on mount and when selectedTeamId changes
  useEffect(() => {
    loadConstraintsData();
  }, [loadConstraintsData]);

  return (
    <>
      {isLoading ? (
        <TablesSkeleton numTables={1} numInternalRows={5} />
      ) : !selectedTeamId ? (
        <div>Please select a team</div>
      ) : (
        <>
          <div className="tab-container">
            <ConstraintList
              lng={lng}
              workers={workers}
              shifts={shifts}
              constraints={constraints}
              constraintTemplates={templates}
              handleOpenAddConstraint={handleOpenAddConstraint}
              handleAddConstraint={handleAddConstraint}
              handleUpdateConstraint={handleUpdateConstraint}
              handleDeleteConstraint={handleDeleteConstraint}
            />
          </div>
          {addingConstraint && (
            <NewConstraint
              lng={lng}
              workers={workers}
              shifts={shifts}
              selectedTeamId={selectedTeamId}
              templates={templates}
              handleCloseAddConstraint={handleCloseAddConstraint}
              handleAddConstraint={handleAddConstraint}
              handleUpdateConstraint={handleUpdateConstraint}
            />
          )}
        </>
      )}
    </>
  );
}
