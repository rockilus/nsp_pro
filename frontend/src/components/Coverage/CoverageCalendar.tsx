import React, { useEffect, useState, useCallback, useRef } from "react";

import WeekViewTable from "./WeekViewTable";
import CoveragesOverlay from "./CoveragesOverlay";
import {
  WeekDays,
  CovTimeColWidth,
  CovTimeColPadR,
  CovHeadRowHeight,
  CovBodyRowHeight,
  CovBorderThick,
} from "../../utils/constants";
import { ShiftDemandT, ColOverlayT, SDOverlayT } from "./types";
import { ShiftDefaultT } from "../Shift/types";

interface Props {
  coverageId: string;
  shiftDemands: ShiftDemandT[];
  shifts: ShiftDefaultT[];
}

export default function CoverageCalendar({
  coverageId,
  shiftDemands,
  shifts,
}: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [dayColWidth, setDayColWidth] = useState<number>(100);
  const [colOverlays, setColOverlays] = useState<ColOverlayT[]>([]);
  const [SDOverlays, setSDOverlays] = useState<SDOverlayT[][]>([]);

  const buildColOverlays = useCallback(() => {
    const colOverlays: ColOverlayT[] = [
      {
        left: 0,
        width: CovTimeColWidth + CovTimeColPadR,
        // color: "red",
        color: "transparent",
        SDOverlays: [],
      },
      ...WeekDays.map((day, index) => {
        return {
          left:
            CovTimeColWidth +
            CovTimeColPadR +
            index * (dayColWidth + CovBorderThick),
          width: dayColWidth,
          // color: colors[index + 1],
          color: "transparent",
          SDOverlays: SDOverlays[index],
        };
      }),
    ];

    setColOverlays(colOverlays);
  }, [dayColWidth, SDOverlays]);

  const convertToSDOverlay = useCallback(
    (shiftDemand: ShiftDemandT): SDOverlayT => {
      const startOfDay = shiftDemand.shift.startTime.startOf("day");
      const minutesDifference = shiftDemand.shift.startTime.diff(
        startOfDay,
        "minute"
      );
      const intervalsQuarter = Math.floor(minutesDifference / 15);
      const intervalsHour = Math.floor(minutesDifference / 60);
      const durationHour = Math.floor(
        shiftDemand.shift.endTime.diff(shiftDemand.shift.startTime, "minute") /
          60
      );
      return {
        top:
          CovHeadRowHeight +
          CovBodyRowHeight * intervalsQuarter +
          CovBorderThick * (intervalsHour + 1),
        left: 0,
        height:
          Math.floor(
            shiftDemand.shift.endTime.diff(
              shiftDemand.shift.startTime,
              "minute"
            ) / 15
          ) *
            CovBodyRowHeight +
          (shiftDemand.shift.startTime.minute() === 0 && durationHour >= 1
            ? durationHour - 1
            : durationHour) *
            CovBorderThick,
        width: dayColWidth,
        color: "blue",
        widthDivisor: 1,
        widthIndex: 0,
        shiftDemand: shiftDemand,
      };
    },
    [dayColWidth]
  );

  const adjustWidthCounts = useCallback(
    (SDOverlays: SDOverlayT[]): SDOverlayT[] => {
      const newSDOverlays = [...SDOverlays];
      for (let i = 0; i < newSDOverlays.length; i++) {
        const endTime = SDOverlays[i].shiftDemand.shift.endTime;
        let j = i + 1;
        while (
          j < newSDOverlays.length &&
          endTime.isAfter(SDOverlays[j].shiftDemand.shift.startTime)
        ) {
          newSDOverlays[j].widthIndex = j - i;
          j++;
        }
        for (let k = i; k <= j && k < newSDOverlays.length; k++) {
          newSDOverlays[k].widthDivisor = j - i;
        }
        i = j;
      }
      return newSDOverlays;
    },
    []
  );

  const buildSDOverlays = useCallback(() => {
    const SDOverlays: SDOverlayT[][] = WeekDays.map((day, index) => {
      return shiftDemands
        .filter((shiftDemand) => shiftDemand.dayIndex === index)
        .sort((a, b) => (a.shift.startTime.isAfter(b.shift.startTime) ? 1 : -1))
        .map((shiftDemand) => convertToSDOverlay(shiftDemand));
    });
    const SDOverlaysAdj: SDOverlayT[][] = SDOverlays.map((SDOs) => {
      return adjustWidthCounts(SDOs);
    });
    setSDOverlays(SDOverlaysAdj);
  }, [shiftDemands, convertToSDOverlay, adjustWidthCounts]);

  useEffect(() => {
    const handleResize = () => {
      if (tableRef.current) {
        const tableWidth =
          tableRef.current.clientWidth - CovTimeColWidth - CovTimeColPadR;
        const width = Math.floor(tableWidth / WeekDays.length);
        setDayColWidth(width);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setDayColWidth]);

  useEffect(() => {
    if (SDOverlays.length > 0) {
      buildColOverlays();
    }
  }, [dayColWidth, SDOverlays, buildColOverlays]);

  useEffect(() => {
    if (shiftDemands) {
      buildSDOverlays();
    }
  }, [shiftDemands, buildSDOverlays]);

  return (
    <div style={{ position: "relative", width: "100%" }} ref={tableRef}>
      <WeekViewTable dayColWidth={dayColWidth} />
      <CoveragesOverlay
        coverageId={coverageId}
        colOverlays={colOverlays}
        shifts={shifts}
      />
    </div>
  );
}
