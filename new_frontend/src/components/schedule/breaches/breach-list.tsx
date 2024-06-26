import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
// Components
import BreachItem from "./breach-item";
// Types
import { ObjectiveBreachT } from "../../../types/schedule";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";

export default function BreachList({
  lng,
  breaches,
  CBsDisplayed,
  workers,
  shifts,
  addCBsDisplayed,
  removeCBsDisplayed,
}: {
  lng: string;
  breaches: ObjectiveBreachT[];
  CBsDisplayed: string[];
  workers: WorkerT[];
  shifts: ShiftT[];
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const CBsConstraint: ObjectiveBreachT[] = breaches
    .filter((cb) => cb.objectiveCategory === "constraint")
    .sort((a, b) => (a.hardToSoft ? -1 : 1));
  const CBsRequest: ObjectiveBreachT[] = breaches.filter(
    (cb) => cb.objectiveCategory === "request"
  );

  const checkedConstraint: boolean = CBsConstraint.some((cb) =>
    CBsDisplayed.includes(cb.id)
  );

  const checkColorConstraint: string = CBsConstraint.every((cb) =>
    CBsDisplayed.includes(cb.id)
  )
    ? "primary"
    : "default";

  const switchDisplayCBsConstraint = () => {
    if (CBsConstraint.every((cb) => CBsDisplayed.includes(cb.id))) {
      removeCBsDisplayed(CBsConstraint.map((cb) => cb.id));
    } else {
      for (let cb of CBsConstraint.filter(
        (cb) => !CBsDisplayed.includes(cb.id)
      )) {
        addCBsDisplayed(CBsConstraint.map((cb) => cb.id));
      }
    }
  };

  const checkedRequest: boolean = CBsRequest.some((cb) =>
    CBsDisplayed.includes(cb.id)
  );

  const checkColorRequest: string = CBsRequest.every((cb) =>
    CBsDisplayed.includes(cb.id)
  )
    ? "primary"
    : "default";

  const switchDisplayCBsRequest = () => {
    if (CBsRequest.every((cb) => CBsDisplayed.includes(cb.id))) {
      removeCBsDisplayed(CBsRequest.map((cb) => cb.id));
    } else {
      for (let cb of CBsRequest.filter((cb) => !CBsDisplayed.includes(cb.id))) {
        addCBsDisplayed(CBsRequest.map((cb) => cb.id));
      }
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        border: "1px solid grey",
        borderRadius: 2,
        margin: 2,
        marginLeft: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minHeight: 45,
          paddingLeft: 1,
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
          {t("breaches")}
        </Typography>
      </Box>
      {breaches.length === 0 ? (
        <Box
          sx={{
            margin: 2,
            backgroundColor: "none",
          }}
        >
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ fontStyle: "italic" }}
          >
            {"No breach."}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, maxWidth: 752 }}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <List dense={true}>
              {breaches.map((breach, index) => (
                <BreachItem
                  key={index}
                  breach={breach}
                  CBDisplayed={CBsDisplayed.includes(breach.id)}
                  workers={workers}
                  shifts={shifts}
                  addCBsDisplayed={addCBsDisplayed}
                  removeCBsDisplayed={removeCBsDisplayed}
                />
              ))}
            </List>
          </Box>
        </Box>
      )}
    </Box>
  );
}
