import React, { ReactElement } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Types
import { MissingProperty } from "../../../types/constraint";
// Styles
import "./missing-properties.css";

export default function MissingProperties({
  lng,
  missingProperties,
}: {
  lng: string;
  missingProperties: MissingProperty[];
}) {
  const { t } = useTranslation(lng, "constraint-page");

  const buildString = (
    missingProperties: MissingProperty[]
  ): ReactElement<any, any> => {
    const mpValuesStringWorkers: string[] = [];
    const mpValuesStringShifts: string[] = [];
    for (const mp of missingProperties) {
      if (mp.isBool) {
        const newString = mp.propertyValues.map((pv) =>
          pv ? mp.dimName.toLowerCase() : "no " + mp.dimName.toLowerCase()
        );
        if (mp.category === "worker") {
          mpValuesStringWorkers.push(...newString);
        } else {
          mpValuesStringShifts.push(...newString);
        }
      } else {
        const newString = mp.propertyValues.map((pv) =>
          String(pv).toLowerCase()
        );
        if (mp.category === "worker") {
          mpValuesStringWorkers.push(...newString);
        } else {
          mpValuesStringShifts.push(...newString);
        }
      }
    }
    if (mpValuesStringShifts.length > 0 && mpValuesStringWorkers.length > 0) {
      return (
        <>
          {t("no")} <strong>{mpValuesStringWorkers.join(", ")}</strong>{" "}
          {t("worker_property").toLowerCase()}, {t("no").toLowerCase()}{" "}
          <strong>{mpValuesStringShifts.join(", ")}</strong>{" "}
          {t("shift property").toLowerCase()}
        </>
      );
    }
    if (mpValuesStringShifts.length > 0) {
      return (
        <>
          {t("no")} <strong>{mpValuesStringShifts.join(", ")}</strong>{" "}
          {t("shift property").toLowerCase()}
        </>
      );
    }
    if (mpValuesStringWorkers.length > 0) {
      return (
        <>
          {t("no")} <strong>{mpValuesStringWorkers.join(", ")}</strong>{" "}
          {t("worker_property").toLowerCase()}
        </>
      );
    }
    return <></>;
  };

  return (
    <span className="constraint-missing-properties">
      {buildString(missingProperties)}
    </span>
  );
}
