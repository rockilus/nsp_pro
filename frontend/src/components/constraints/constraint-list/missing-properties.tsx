import React, { ReactElement } from "react";
import { useTranslation } from "../../../app/i18n/client";
// Types
import { MissingAttribute } from "../../../types/constraint";
import { AttributeOwnerType } from "../../../types/attribute";
// Styles
import "./missing-properties.css";

export default function MissingProperties({
  lng,
  missingProperties,
}: {
  lng: string;
  missingProperties: MissingAttribute[];
}) {
  const { t } = useTranslation(lng, "constraint-page");

  const buildString = (
    missingProperties: MissingAttribute[],
  ): ReactElement<any, any> => {
    const mpValuesStringWorkers: string[] = [];
    const mpValuesStringShifts: string[] = [];
    for (const mp of missingProperties) {
      if (mp.isBool) {
        const newString = mp.attributeValues.map((pv) =>
          pv ? mp.dimName.toLowerCase() : "no " + mp.dimName.toLowerCase(),
        );
        if (mp.category === AttributeOwnerType.WORKER) {
          mpValuesStringWorkers.push(...newString);
        } else {
          mpValuesStringShifts.push(...newString);
        }
      } else {
        const newString = mp.attributeValues.map((pv) =>
          String(pv).toLowerCase(),
        );
        if (mp.category === AttributeOwnerType.WORKER) {
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
