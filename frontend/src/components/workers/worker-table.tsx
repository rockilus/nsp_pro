import React, { useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// Components
import NewDimensionForm from "../shift-worker-shared/dimension/new-dimension-form";
import DimensionCell from "../shift-worker-shared/dimension/dimension-cell";
import AttributeCell from "../shift-worker-shared/attribute/attribute-cell";
import PopoverRHS from "../inputs/popover-rhs";
import TableAddButton from "../buttons/table-add-button";
import WorkerFieldCell from "./worker-field-cell/worker-field-cell";
import WorkerSpecialtyHeaderCell from "./worker-field-cell/worker-specialty-header-cell";
// Styles
import "../../styles/text-styles.css";
import "../../styles/table-styles.css";
// Types
import { WorkerT } from "../../types/worker";
import {
  DimensionT,
  DimEntryT,
  DimensionType,
  DimensionEntryType,
} from "../../types/dimension";
import { AttributeT, AttributeOwnerType } from "../../types/attribute";
import { SpecialtyT } from "../../types/team";

export default function WorkerTable({
  lng,
  selectedTeamId,
  dimensions,
  dimEntries,
  workers,
  specialties,
  defaultWorkerFields,
  handleAddWorker,
  handleUpdateWorker,
  handleDeleteWorker,
  handleAddDimension,
  handleUpdateDimension,
  handleDeleteDimension,
  handleAddDimEntry,
  handleUpdateDimEntry,
  handleDeleteDimEntry,
  handleUpdateAttribute,
  handleAddSpecialty,
  handleUpdateSpecialty,
  handleDeleteSpecialty,
}: {
  lng: string;
  selectedTeamId: string;
  dimensions: DimensionT[];
  dimEntries: DimEntryT[];
  workers: WorkerT[];
  specialties: SpecialtyT[];
  defaultWorkerFields: Record<string, string>[];
  handleAddWorker: () => void;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
  handleDeleteWorker: (workerId: string) => void;
  handleAddDimension: (
    newDimension: DimensionT,
    dimEntries: DimEntryT[]
  ) => Promise<boolean>;
  handleUpdateDimension: (dimension: DimensionT) => void;
  handleDeleteDimension: (dimensionId: string) => void;
  handleAddDimEntry: (dimEntry: DimEntryT) => void;
  handleUpdateDimEntry: (dimEntry: DimEntryT) => void;
  handleDeleteDimEntry: (dimEntryId: string) => void;
  handleUpdateAttribute: (attribute: AttributeT, teamId: string) => void;
  handleAddSpecialty: (specialty: SpecialtyT) => void;
  handleUpdateSpecialty: (specialty: SpecialtyT) => void;
  handleDeleteSpecialty: (specialtyId: string) => void;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  const dimensionsDisplayed = dimensions.filter((dim) =>
    dim.dimTypes.includes(DimensionType.WORKER)
  );

  return (
    <div>
      <div className="title-container">
        <span className="title">{t("workers")}</span>
        <PopoverRHS
          title={t("new_property")}
          buttonContent={<TableAddButton text={t("property")} />}
          content={
            <NewDimensionForm
              lng={lng}
              selectedTeamId={selectedTeamId}
              dimensionType={DimensionType.WORKER}
              dimensions={dimensions}
              dimEntries={dimEntries}
              setOpenParent={setPopoverRhsOpen}
              handleAddDimension={handleAddDimension}
              handleUpdateDimension={handleUpdateDimension}
            />
          }
          open={popoverRhsOpen}
          setOpen={setPopoverRhsOpen}
        />
      </div>
      <TableContainer sx={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              {defaultWorkerFields.map((field, index) =>
                field.name === "specialties" ? (
                  <WorkerSpecialtyHeaderCell
                    key={index}
                    lng={lng}
                    teamId={selectedTeamId}
                    specialties={specialties}
                    handleAddSpecialty={handleAddSpecialty}
                    handleUpdateSpecialty={handleUpdateSpecialty}
                    handleDeleteSpecialty={handleDeleteSpecialty}
                  />
                ) : (
                  <TableCell key={index} sx={{ paddingY: 0 }}>
                    <span className="table-header-default">{field.label}</span>
                  </TableCell>
                )
              )}

              {dimensionsDisplayed.map((dim, dIndex) => (
                <DimensionCell
                  key={dIndex}
                  lng={lng}
                  selectedTeamId={selectedTeamId}
                  dimensionTypeTable={DimensionType.WORKER}
                  dimension={dim}
                  dimEntries={dimEntries.filter(
                    (de) => de.dimensionId === dim.id
                  )}
                  handleUpdateDimension={handleUpdateDimension}
                  handleDeleteDimension={handleDeleteDimension}
                  handleAddDimEntry={handleAddDimEntry}
                  handleUpdateDimEntry={handleUpdateDimEntry}
                  handleDeleteDimEntry={handleDeleteDimEntry}
                />
              ))}
              <TableCell sx={{ padding: 0, width: 110 }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workers.map((worker, workerIndex) => (
              <TableRow
                key={workerIndex}
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                {defaultWorkerFields.map((field, index) => (
                  <WorkerFieldCell
                    key={index}
                    worker={worker}
                    workerField={field.name}
                    editing={bodyEditing}
                    setEditing={setBodyEditing}
                    handleUpdateWorker={handleUpdateWorker}
                  />
                ))}
                {dimensionsDisplayed.map((dim, dIndex) => {
                  const attribute = worker.attributes.find(
                    (a) => a.dimensionId === dim.id
                  );
                  return (
                    <AttributeCell
                      key={dIndex}
                      selectedTeamId={selectedTeamId}
                      attribute={
                        attribute
                          ? attribute
                          : {
                              id: "",
                              ownerType: AttributeOwnerType.WORKER,
                              ownerId: worker.id,
                              dimensionId: dim.id,
                              value:
                                dim.entryType === DimensionEntryType.BOOL
                                  ? false
                                  : "",
                              dimEntryIds: [],
                            }
                      }
                      dimension={dim}
                      dimEntries={dimEntries.filter(
                        (de) => de.dimensionId === dim.id
                      )}
                      editing={bodyEditing[worker.id] === dim.id}
                      setEditing={setBodyEditing}
                      handleUpdateAttribute={handleUpdateAttribute}
                    />
                  );
                })}
                <TableCell component="th" scope="row" sx={{ paddingY: 0 }}>
                  <Box sx={{ display: "flex" }}>
                    <Button onClick={() => handleDeleteWorker(worker.id)}>
                      <DeleteIcon />
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* </div> */}
      <div className="add-row-button-container">
        <TableAddButton text={t("worker")} handleClick={handleAddWorker} />
      </div>
    </div>
  );
}
