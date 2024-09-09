import React from "react";
import { useTranslation } from "../../../app/i18n/client";
// Components
import BreachItem from "./breach-item";
// Types
import { BreachT } from "../../../types/schedule";
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
  breaches: BreachT[];
  CBsDisplayed: string[];
  workers: WorkerT[];
  shifts: ShiftT[];
  addCBsDisplayed: (ids: string[]) => void;
  removeCBsDisplayed: (ids: string[]) => void;
}) {
  const { t } = useTranslation(lng, "schedule-page");

  const CBsConstraint: BreachT[] = breaches
    .filter((cb) => cb.objectiveCategory === "constraint")
    .sort((a, b) => (a.hardToSoft ? -1 : 1));
  const CBsRequest: BreachT[] = breaches.filter(
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignSelf: "flex-start",
        width: "100%",
        margin: "10px 10px 5px 5px",
      }}
    >
      <span
        style={{
          fontSize: "1rem",
          fontWeight: 600,
          color: "#3C4043",
        }}
      >
        {t("breaches")}
      </span>
      {breaches.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            borderBottom: "0.5px solid lightgrey",
            padding: "5px 0",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontWeight: 400,
              fontSize: "0.875rem",
              fontStyle: "italic",
              lineHeight: "1.4",
              letterSpacing: "0.001rem",
              margin: "0",
              padding: "0 5px 0 0",
            }}
          >
            {"No breach."}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
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
        </div>
      )}
    </div>
  );
}
