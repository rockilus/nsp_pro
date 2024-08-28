import dayjs from "dayjs";
// Types
import {
  ShiftDemandT,
  EventT,
  ShiftDemandCalendarT,
} from "../../types/coverage";

const shiftDemandsToEvents = (shiftDemands: ShiftDemandT[]): EventT[] => {
  const out: EventT[] = [];
  const shiftDemandsCalendar = buildShiftDemandCalendar(shiftDemands);
  const groupedShiftDemands = groupByDayIndex(shiftDemandsCalendar);
  groupedShiftDemands.forEach((group, dayIndex) => {
    const overlapIdGroups = groupOverlappingShifts(group);
    const events = convertShiftDemandToEvent(group, overlapIdGroups);
    out.push(...events);
  });
  return out;
};

const buildShiftDemandCalendar = (
  shiftDemands: ShiftDemandT[]
): ShiftDemandCalendarT[] => {
  const out: ShiftDemandCalendarT[] = [];
  shiftDemands.forEach((shiftDemand) => {
    const isTwoDays =
      shiftDemand.shift.startTime.day() !== shiftDemand.shift.endTime.day();
    if (!isTwoDays) {
      out.push({
        ...shiftDemand,
        isTwoDays,
        isSecondDay: false,
        startTime: shiftDemand.shift.startTime,
        endTime: shiftDemand.shift.endTime,
      });
    } else {
      out.push({
        ...shiftDemand,
        isTwoDays,
        isSecondDay: false,
        startTime: shiftDemand.shift.startTime,
        endTime: shiftDemand.shift.startTime.endOf("day"),
      });
      out.push({
        ...shiftDemand,
        isTwoDays,
        isSecondDay: true,
        dayIndex: (shiftDemand.dayIndex + 1) % 7,
        startTime: shiftDemand.shift.endTime.startOf("day"),
        endTime: shiftDemand.shift.endTime,
      });
    }
  });
  return out;
};

const shiftDemandCalendarToShiftDemand = (
  shiftDemand: ShiftDemandCalendarT
): ShiftDemandT => {
  return {
    id: shiftDemand.id,
    dayIndex: shiftDemand.dayIndex,
    shift: shiftDemand.shift,
    coverageId: shiftDemand.coverageId,
  };
};

const setDayJSDate = (date: dayjs.Dayjs): dayjs.Dayjs => {
  return date.set("year", 2021).set("month", 0).set("date", 1);
};

const groupByDayIndex = (
  shiftDemands: ShiftDemandCalendarT[]
): Map<number, ShiftDemandCalendarT[]> => {
  const map = new Map<number, ShiftDemandCalendarT[]>();
  shiftDemands.forEach((shiftDemand) => {
    const dayIndex = shiftDemand.dayIndex;
    if (!map.has(dayIndex)) {
      map.set(dayIndex, []);
    }
    map.get(dayIndex)!.push(shiftDemand);
  });
  return map;
};

// Main function to group overlapping shift demands
export const groupOverlappingShifts = (
  shiftDemands: ShiftDemandCalendarT[]
): string[][] => {
  const overlappingGroups: string[][] = [];

  // Iterate over all shift demands
  for (let i = 0; i < shiftDemands.length; i++) {
    const currentShiftDemand = shiftDemands[i];
    let maxStartTime = setDayJSDate(currentShiftDemand.startTime);
    let minEndTime = setDayJSDate(currentShiftDemand.endTime);
    const overlappingShifts = [currentShiftDemand.id];

    // Compare with the other shift demands
    for (let j = 0; j < shiftDemands.length; j++) {
      if (i !== j) {
        const otherShiftDemand = shiftDemands[j];
        const otherSDStartTimeSameDay = setDayJSDate(
          otherShiftDemand.startTime
        );
        const otherSDEndTimeSameDay = setDayJSDate(otherShiftDemand.endTime);

        // Check if they overlap
        if (
          otherSDStartTimeSameDay.isBefore(minEndTime) &&
          otherSDEndTimeSameDay.isAfter(maxStartTime)
        ) {
          overlappingShifts.push(otherShiftDemand.id);
          maxStartTime = maxStartTime.isAfter(otherSDStartTimeSameDay)
            ? maxStartTime
            : otherSDStartTimeSameDay;
          minEndTime = minEndTime.isBefore(otherSDEndTimeSameDay)
            ? minEndTime
            : otherSDEndTimeSameDay;
        }
      }
    }

    // Sort the array to prevent different orders being considered unique
    overlappingShifts.sort();

    // Check if this group already exists or is a subset of another
    const isSubsetOrDuplicate = overlappingGroups.some(
      (existingGroup) =>
        existingGroup.length === overlappingShifts.length &&
        existingGroup.every((id, idx) => id === overlappingShifts[idx])
    );

    // Add the group if it's unique
    if (!isSubsetOrDuplicate) {
      overlappingGroups.push(overlappingShifts);
    }
  }

  return overlappingGroups;
};

const convertShiftDemandToEvent = (
  shiftDemands: ShiftDemandCalendarT[],
  overlapIdGroups: string[][]
): EventT[] => {
  const events: EventT[] = [];

  overlapIdGroups.forEach((group, index) => {
    const numOverlap = group.length;
    const existingEvents = events.filter((event) =>
      group.includes(event.shiftDemand.id)
    );
    group.forEach((id, idx) => {
      // Number of overlap for this shift demand
      const overlapGroupsWithId = overlapIdGroups.filter((group) =>
        group.includes(id)
      );
      const maxOverlap = Math.max(
        ...overlapGroupsWithId.map((group) => group.length)
      );
      const shiftDemand = shiftDemands.find((sd) => sd.id === id);
      if (shiftDemand) {
        // Update number of overlap for exisiting event, in case a shift demand
        // is in different overlap groups of different length
        const existingEvent = existingEvents.find(
          (event) => event.shiftDemand.id === shiftDemand.id
        );
        if (existingEvent) {
          if (numOverlap > existingEvent.numOverlap) {
            existingEvent.numOverlap = numOverlap;
          }
          return; // Skip this shiftDemand and continue the forEach loop
        }
        // Check if position index already used by another event, and look for
        // unused index if so
        const indexAlreadyUsed = existingEvents.some(
          (event) => event.indexPosition === idx
        );
        let indexPosition = idx;
        if (indexAlreadyUsed) {
          for (let i = 0; i < maxOverlap; i++) {
            const isIndexUsed = existingEvents.some(
              (event) => event.indexPosition === i
            );
            if (!isIndexUsed) {
              indexPosition = i;
            }
          }
        }

        const event: EventT = {
          startHour:
            shiftDemand.startTime.hour() + shiftDemand.startTime.minute() / 60,
          durationHour:
            shiftDemand.endTime.diff(shiftDemand.startTime, "minute", true) /
            60,
          numOverlap: numOverlap,
          indexPosition: indexPosition,
          maxOverlap: maxOverlap,
          borderTopRadius: !shiftDemand.isTwoDays || !shiftDemand.isSecondDay,
          borderBottomRadius: !(
            shiftDemand.isTwoDays && !shiftDemand.isSecondDay
          ),
          shiftDemand: shiftDemandCalendarToShiftDemand(shiftDemand),
        };
        events.push(event);
      }
    });
  });
  return events;
};

export default shiftDemandsToEvents;
