import React, { useState } from "react";
import { useTranslation } from "react-i18next";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
// Components
import PopoverRHS from "../SharedComponents/PopoverRHS";
import RequestPanel from "./RequestPanel";
import RequestTable from "./RequestTable";
import TableAddButton from "../SharedComponents/TableAddButton";
import { emptyRequest } from "../../utils/emptyObjects";
// Types
import { RequestT } from "./types";
import { ShiftT } from "../Shift/types";
import { TeamT } from "../../containers/types";
import { WorkerT } from "../Worker/types";

interface Props {
  team: TeamT;
  workers: WorkerT[];
  shifts: ShiftT[];
  requests: RequestT[];
}

export default function RequestTab({ team, workers, shifts, requests }: Props) {
  const { t } = useTranslation();

  const [popoverRhsOpen, setPopoverRhsOpen] = useState<boolean>(false);

  const handleClosePopoverRhs = () => {
    setPopoverRhsOpen(false);
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
            {t("request.requests")}
          </Typography>
          <PopoverRHS
            title={t("request.new_request")}
            buttonContent={<TableAddButton text={t("common.request")} />}
            content={
              <RequestPanel
                team={team}
                request={emptyRequest}
                workers={workers}
                shifts={shifts}
                handleClose={handleClosePopoverRhs}
              />
            }
            open={popoverRhsOpen}
            setOpen={setPopoverRhsOpen}
          />
        </Box>
      </Box>
      <RequestTable
        team={team}
        requests={requests}
        workers={workers}
        shifts={shifts}
      />
    </Box>
  );
}
