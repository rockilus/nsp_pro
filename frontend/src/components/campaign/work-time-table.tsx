import React from "react";
import "./work-time-table.css";

interface WorkTimeTableProps {
  data: {
    duties: { h: number; count: number };
    other: { h: number; count: number };
    workers: { h: number; count: number };
  };
}

const WorkTimeTable: React.FC<WorkTimeTableProps> = () =>
  // { data }
  {
    const data = {
      duties: { h: 150, count: 10 },
      other: { h: 120, count: 20 },
      workers: { h: 270, count: 30 },
    };

    const { duties, other, workers } = data;

    return (
      <table className="work-time-table">
        <thead>
          <tr>
            <th></th>
            <th className="column-header" colSpan={2}>
              Duties
            </th>
            <th></th>
            <th className="column-header" colSpan={2}>
              Other
            </th>
            <th></th>
            <th className="column-header" colSpan={2}>
              Total
            </th>
          </tr>
          <tr>
            <th></th>
            <th className="column-subheader">h</th>
            <th className="column-subheader">#</th>
            <th className="column-separator"></th>
            <th className="column-subheader">h</th>
            <th className="column-subheader">#</th>
            <th className="column-separator"></th>
            <th className="column-subheader">h</th>
            <th className="column-subheader">#</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th className="row-header">Shifts</th>
            <td className="cell-content">{duties.h}</td>
            <td className="cell-content">{duties.count}</td>
            <td className="column-separator"></td>
            <td className="cell-content">{other.h}</td>
            <td className="cell-content">{other.count}</td>
            <td className="column-separator"></td>
            <td className="cell-content">{duties.h + other.h}</td>
            <td className="cell-content">{duties.count + other.count}</td>
          </tr>
          <tr>
            <th className="row-header">Workers</th>
            <td className="cell-content">{workers.h}</td>
            <td className="cell-content">{workers.count}</td>
            <td></td>
            <td className="cell-content">{workers.h - duties.h}</td>
            <td className="cell-content">{workers.count}</td>
            <td></td>
            <td className="cell-content">{workers.h}</td>
            <td className="cell-content">{workers.h}</td>
          </tr>
          <tr>
            <th className="row-header">Worker/week</th>
            <td className="cell-content">{duties.h}</td>
            <td className="cell-content">{duties.count}</td>
            <td></td>
            <td className="cell-content">{other.h}</td>
            <td className="cell-content">{other.count}</td>
            <td></td>
            <td className="cell-content">{duties.h + other.h}</td>
            <td className="cell-content">{duties.count + other.count}</td>
          </tr>
        </tbody>
      </table>
    );
  };

export default WorkTimeTable;
