import React, { useState } from "react";
// MUI
import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
// Components
import NewWorkerDimensionForm from "./NewWorkerDimensionForm";
import PopoverRHS from "../../utils/PopoverRHS";
import WorkerPropertyCell from "./WorkerPropertyCell";
import WorkerDimensionCell from "./WorkerDimensionCell";
import WorkerFieldCell from "./WorkerFieldCell";
// Stores
import { useWorkerStore } from "../../stores/workerStore";
// Types
import { WorkerDimensionT, WorkerT } from "./types";
import { TeamT } from "../../containers/types";
// Constants
import { DefaultProperties } from "../../utils/constants";

interface Props {
  team: TeamT;
  workerDimensions: WorkerDimensionT[];
  workers: WorkerT[];
  defaultWorkerFields: string[];
}

export default function WorkerTable({
  team,
  workerDimensions,
  workers,
  defaultWorkerFields,
}: Props) {
  const [bodyEditing, setBodyEditing] = useState<{ [key: string]: string }>({});
  const [popoverRhsOpen, setPopoverRhsOpen] = useState(false);

  const addWorker = useWorkerStore((state) => state.addWorker);
  const deleteWorker = useWorkerStore((state) => state.deleteWorker);

  const handleAddWorker = () => {
    addWorker({
      id: "",
      teamId: team.id,
      name: "",
      workerProperties: [],
    });
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
                  display="flex"
                  justifyContent="space-between"
                  width="100%"
                  alignItems="center"
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    Workers
                  </Typography>
                  <PopoverRHS
                    title={"New property"}
                    buttonContent={
                      <Button
                        sx={{
                          borderRadius: 4,
                          textTransform: "none",
                          border: "1px solid",
                          height: "30px",
                          color: "grey.700",
                          marginY: 1,
                        }}
                      >
                        Add property
                      </Button>
                    }
                    content={
                      <NewWorkerDimensionForm
                        setOpenParent={setPopoverRhsOpen}
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
                <TableCell key={index} sx={{ paddingY: 1, fontWeight: "bold" }}>
                  {field}
                </TableCell>
              ))}
              {workerDimensions.map((wd, wdIndex) => (
                <WorkerDimensionCell key={wdIndex} workerDimension={wd} />
              ))}
              <TableCell sx={{ padding: 0, width: 110 }}>
                {/* <PopoverRHS
                  title={"New property"}
                  buttonContent={
                    <Button
                      sx={{
                        borderRadius: 4,
                        textTransform: "none",
                        border: "1px solid",
                        height: "30px",
                        color: "grey.700",
                        marginY: 1,
                      }}
                    >
                      Add property
                    </Button>
                  }
                  content={
                    <NewWorkerDimensionForm setOpenParent={setPopoverRhsOpen} />
                  }
                  open={popoverRhsOpen}
                  setOpen={setPopoverRhsOpen}
                /> */}
              </TableCell>
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
                    workerField={field}
                    editing={bodyEditing}
                    setEditing={setBodyEditing}
                  />
                ))}
                {workerDimensions.map((wd, wdIndex) => {
                  const workerProperty = worker.workerProperties.find(
                    (wp) => wp.workerDimensionId === wd.id
                  );
                  return (
                    <WorkerPropertyCell
                      key={wdIndex}
                      team={team}
                      workerProperty={
                        workerProperty
                          ? workerProperty
                          : {
                              id: "",
                              workerId: worker.id,
                              workerDimensionId: wd.id,
                              value: DefaultProperties[wd.entryType],
                            }
                      }
                      workerDimension={wd}
                      editing={bodyEditing[worker.id] === wd.id}
                      setEditing={setBodyEditing}
                    />
                  );
                })}
                <TableCell component="th" scope="row">
                  <Box sx={{ display: "flex" }}>
                    <Button onClick={() => deleteWorker(worker.id, team.id)}>
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
                <Button
                  onClick={handleAddWorker}
                  sx={{
                    borderRadius: 4,
                    textTransform: "none",
                    border: "1px solid",
                    height: "30px",
                    color: "grey.700",
                    marginY: 1,
                  }}
                >
                  Add worker
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
