import React, { useState } from "react";
import { useTranslation } from "../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Components
import NewWorkerDimensionForm from "./new-worker-dimension-form";
import PopoverRHS from "../inputs/popover-rhs";
import TableAddButton from "../buttons/table-add-button";
import WorkerPropertyCell from "./worker-property-cell";
import WorkerDimensionCell from "./worker-dimension-cell";
import WorkerFieldCell from "./worker-field-cell";
// Types
import { WorkerDimensionT, WorkerT, WorkerPropertyT } from "../../types/worker";

export default function WorkerTable({
  lng,
  selectedTeamId,
  workerDimensions,
  workers,
  defaultWorkerFields,
  handleAddWorker,
  handleDeleteWorker,
  handleAddWorkerDimension,
  handleUpdateWorkerProperty,
  handleUpdateWorkerDimension,
  handleUpdateWorker,
  handleDeleteWorkerDimension,
}: {
  lng: string;
  selectedTeamId: string;
  workerDimensions: WorkerDimensionT[];
  workers: WorkerT[];
  defaultWorkerFields: Record<string, string>[];
  handleAddWorker: () => void;
  handleDeleteWorker: (workerId: string) => void;
  handleAddWorkerDimension: (
    newWorkerDimension: WorkerDimensionT
  ) => Promise<boolean>;
  handleUpdateWorkerProperty: (
    workerProperty: WorkerPropertyT,
    teamId: string
  ) => void;
  handleUpdateWorkerDimension: (workerDimension: WorkerDimensionT) => void;
  handleUpdateWorker: (updatedWorker: WorkerT) => void;
  handleDeleteWorkerDimension: (workerDimensionId: string) => void;
}) {
  const { t } = useTranslation(lng, "worker-page");

  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  console.log("workerDimensions", workerDimensions);

  const defaultProperties: {
    str: string;
    int: string;
    bool: boolean;
    list: string[];
    [key: string]: string | boolean | string[];
  } = {
    str: "",
    int: "",
    bool: false,
    list: [],
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead sx={{ backgroundColor: "grey.100" }}>
            <TableRow>
              <TableCell
                colSpan={
                  defaultWorkerFields.length + workerDimensions.length + 1
                }
                sx={{ paddingY: 0 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      minHeight: 45,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {t("workers")}
                    </Typography>
                  </Box>
                  <PopoverRHS
                    title={t("new_property")}
                    buttonContent={<TableAddButton text={t("property")} />}
                    content={
                      <NewWorkerDimensionForm
                        lng={lng}
                        selectedTeamId={selectedTeamId}
                        setOpenParent={setPopoverRhsOpen}
                        handleAddWorkerDimension={handleAddWorkerDimension}
                      />
                    }
                    open={popoverRhsOpen}
                    setOpen={setPopoverRhsOpen}
                  />
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              {defaultWorkerFields.map((field, index) => (
                <TableCell key={index} sx={{ paddingY: 0, fontWeight: "bold" }}>
                  <Box
                    sx={{
                      minHeight: 45,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {field.label}
                  </Box>
                </TableCell>
              ))}
              {workerDimensions.map((wd, wdIndex) => (
                <WorkerDimensionCell
                  lng={lng}
                  key={wdIndex}
                  selectedTeamId={selectedTeamId}
                  workerDimension={wd}
                  handleUpdateWorkerDimension={handleUpdateWorkerDimension}
                  handleDeleteWorkerDimension={handleDeleteWorkerDimension}
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
                {workerDimensions.map((wd, wdIndex) => {
                  const workerProperty = worker.workerProperties.find(
                    (wp) => wp.workerDimensionId === wd.id
                  );
                  return (
                    <WorkerPropertyCell
                      key={wdIndex}
                      selectedTeamId={selectedTeamId}
                      workerProperty={
                        workerProperty
                          ? workerProperty
                          : {
                              id: "",
                              workerId: worker.id,
                              workerDimensionId: wd.id,
                              value: defaultProperties[wd.entryType],
                            }
                      }
                      workerDimension={wd}
                      editing={bodyEditing[worker.id] === wd.id}
                      setEditing={setBodyEditing}
                      handleUpdateWorkerProperty={handleUpdateWorkerProperty}
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
            <TableRow sx={{ backgroundColor: "grey.100" }}>
              <TableCell
                colSpan={
                  defaultWorkerFields.length + workerDimensions.length + 1
                }
                sx={{ paddingY: 0 }}
              >
                <Box display="flex" alignItems="center" minHeight={45}>
                  <TableAddButton
                    text={t("worker")}
                    handleClick={handleAddWorker}
                  />
                </Box>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
