import React from "react";
import { useTranslation } from "../../app/i18n/client";
// Styles
import "./work-time-table.css";
// Types
import { WorkTimeTableT } from "../../types/schedule";
import { log } from "console";

interface WorkTimeTableProps {
  lng: string;
  data: WorkTimeTableT;
}

const WorkTimeTable: React.FC<WorkTimeTableProps> = ({ lng, data }) => {
  const { t } = useTranslation(lng, "campaign-page");

  const { duties, others, workers, nbWeeks } = data;

  const formatNumber = (num: number) => {
    return num === 0 ? "-" : num.toLocaleString();
  };

  const convertToPerWeek = (x: number, nbDeci: number) => {
    const perWeek = (x / nbWeeks).toFixed(nbDeci);
    return formatNumber(parseFloat(perWeek));
  };

  const workerHoursForOthers = Math.max(workers.hours - duties.hours, 0);

  const dutiesCellsClassName = `cell-content ${
    duties.hours > workers.hours && "light-red"
  }`;
  const othersCellsClassName = `cell-content ${
    others.hours > workerHoursForOthers && "light-red"
  }`;
  const totalCellsClassName = `cell-content ${
    duties.hours + others.hours > workers.hours && "light-red"
  }`;

  return (
    <table className="work-time-table">
      <thead>
        <tr>
          <th></th>
          <th colSpan={2}>
            <div className="column-header">{t("duties")}</div>
          </th>
          <th></th>
          <th colSpan={2}>
            <div className="column-header">{t("others")}</div>
          </th>
          <th></th>
          <th colSpan={2}>
            <div className="column-header">{t("total")}</div>
          </th>
        </tr>
        <tr>
          <th></th>
          <th>
            <div className="column-subheader">{t("h")}</div>
          </th>
          <th>
            <div className="column-subheader">#</div>
          </th>
          <th className="column-separator"></th>
          <th>
            <div className="column-subheader">{t("h")}</div>
          </th>
          <th>
            <div className="column-subheader">#</div>
          </th>
          <th className="column-separator"></th>
          <th>
            <div className="column-subheader">{t("h")}</div>
          </th>
          <th>
            <div className="column-subheader">#</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>
            <div className="row-header">{t("shifts")}</div>
          </th>
          <td>
            <div className={dutiesCellsClassName}>
              {formatNumber(duties.hours)}
            </div>
          </td>
          <td>
            <div className={dutiesCellsClassName}>
              {formatNumber(duties.count)}
            </div>
          </td>
          <td className="column-separator"></td>
          <td>
            <div className={othersCellsClassName}>
              {formatNumber(others.hours)}
            </div>
          </td>
          <td>
            <div className={othersCellsClassName}>
              {formatNumber(others.count)}
            </div>
          </td>
          <td className="column-separator"></td>
          <td>
            <div className={totalCellsClassName}>
              {formatNumber(duties.hours + others.hours)}
            </div>
          </td>
          <td>
            <div className={totalCellsClassName}>
              {formatNumber(duties.count + others.count)}
            </div>
          </td>
        </tr>
        <tr>
          <th>
            <div className="row-header">{t("workers")}</div>
          </th>
          <td>
            <div className={dutiesCellsClassName}>
              {formatNumber(workers.hours)}
            </div>
          </td>
          <td>
            <div className={dutiesCellsClassName}>
              {formatNumber(workers.count)}
            </div>
          </td>
          <td></td>
          <td>
            <div className={othersCellsClassName}>
              {formatNumber(workerHoursForOthers)}
            </div>
          </td>
          <td>
            <div className={othersCellsClassName}>
              {formatNumber(workers.count)}
            </div>
          </td>
          <td></td>
          <td>
            <div className={totalCellsClassName}>
              {formatNumber(workers.hours)}
            </div>
          </td>
          <td>
            <div className={totalCellsClassName}>
              {formatNumber(workers.count)}
            </div>
          </td>
        </tr>
        <tr>
          <th>
            <div className="row-header">{t("per_worker_per_week")}</div>
          </th>
          <td>
            <div className={dutiesCellsClassName}>
              {convertToPerWeek(duties.hours / workers.count, 0)}
            </div>
          </td>
          <td>
            <div className={dutiesCellsClassName}>
              {convertToPerWeek(duties.count / workers.count, 1)}
            </div>
          </td>
          <td></td>
          <td>
            <div className={othersCellsClassName}>
              {convertToPerWeek(others.hours / workers.count, 0)}
            </div>
          </td>
          <td>
            <div className={othersCellsClassName}>
              {convertToPerWeek(others.count / workers.count, 1)}
            </div>
          </td>
          <td></td>
          <td>
            <div className={totalCellsClassName}>
              {convertToPerWeek(
                (duties.hours + others.hours) / workers.count,
                0
              )}
            </div>
          </td>
          <td>
            <div className={totalCellsClassName}>
              {convertToPerWeek(
                (duties.count + others.count) / workers.count,
                1
              )}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default WorkTimeTable;
