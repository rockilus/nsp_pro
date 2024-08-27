import dayjs from "dayjs";
// Types
import {
  ShiftDemandT,
  EventT,
  ShiftDemandCalendarT,
} from "../../types/coverage";

const shiftDemandsToEvents = (shiftDemands: ShiftDemandT[]): EventT[] => {
  const out: EventT[] = [];
  const nextDayOverlapSDs = buildNextDayOverlapSDs(shiftDemands);
  const shiftDemandsWithNextDayOverlap = [
    ...shiftDemands,
    ...nextDayOverlapSDs,
  ];
  const groupedShiftDemands = groupByDayIndex(shiftDemandsWithNextDayOverlap);
  groupedShiftDemands.forEach((group, dayIndex) => {
    const overlapIdGroups = groupOverlappingShifts(group);
    const events = convertShiftDemandToEvent(
      group,
      overlapIdGroups,
      dayIndex,
      nextDayOverlapSDs
    );
    out.push(...events);
  });
  return out;
};

const buildNextDayOverlapSDs = (
  shiftDemands: ShiftDemandT[]
): ShiftDemandT[] => {
  const out: ShiftDemandT[] = [];
  shiftDemands.forEach((shiftDemand) => {
    // out.push(shiftDemand);
    if (shiftDemand.shift.startTime.day() !== shiftDemand.shift.endTime.day()) {
      out.push({
        ...shiftDemand,
        dayIndex: (shiftDemand.dayIndex + 1) % 7,
      });
    }
  });
  return out;
};

const groupByDayIndex = (
  shiftDemands: ShiftDemandT[]
): Map<number, ShiftDemandT[]> => {
  const map = new Map<number, ShiftDemandT[]>();
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
  shiftDemands: ShiftDemandT[]
): string[][] => {
  const overlappingGroups: string[][] = [];

  // Iterate over all shift demands
  for (let i = 0; i < shiftDemands.length; i++) {
    const currentShiftDemand = shiftDemands[i];
    let maxStartTime = currentShiftDemand.shift.startTime;
    let minEndTime = currentShiftDemand.shift.endTime;
    const overlappingShifts = [currentShiftDemand.id];

    // Compare with the other shift demands
    for (let j = 0; j < shiftDemands.length; j++) {
      if (i !== j) {
        const otherShiftDemand = shiftDemands[j];

        // Check if they overlap
        if (
          otherShiftDemand.shift.startTime.isBefore(minEndTime) &&
          otherShiftDemand.shift.endTime.isAfter(maxStartTime)
        ) {
          overlappingShifts.push(otherShiftDemand.id);
          maxStartTime = maxStartTime.isAfter(otherShiftDemand.shift.startTime)
            ? maxStartTime
            : otherShiftDemand.shift.startTime;
          minEndTime = minEndTime.isBefore(otherShiftDemand.shift.endTime)
            ? minEndTime
            : otherShiftDemand.shift.endTime;
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
  shiftDemands: ShiftDemandT[],
  // nextDayOverlapSDs: ShiftDemandT[],
  overlapIdGroups: string[][],
  dayIndex: number,
  nextDayOverlapSDs: ShiftDemandT[]
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
        // Check if shift demand is second day of a two days shift
        const isTwoDay = nextDayOverlapSDs.some(
          (sd) => sd.id === shiftDemand.id
        );
        const isSecondDay = nextDayOverlapSDs.some(
          (sd) => sd.id === shiftDemand.id && sd.dayIndex === dayIndex
        );
        console.log("shiftDemand", shiftDemand);
        console.log("dayIndex", dayIndex);
        console.log("isSecondDay", isSecondDay);
        console.log("nextDayOverlapSDs", nextDayOverlapSDs);
        const startHour = isSecondDay
          ? 0
          : shiftDemand.shift.startTime.hour() +
            shiftDemand.shift.startTime.minute() / 60;
        const endHour =
          isTwoDay && !isSecondDay
            ? 24
            : shiftDemand.shift.endTime.hour() +
              shiftDemand.shift.endTime.minute() / 60;
        const durationHour = endHour - startHour;

        const event: EventT = {
          startHour: startHour,
          durationHour: durationHour,
          numOverlap: numOverlap,
          indexPosition: indexPosition,
          maxOverlap: maxOverlap,
          borderTopRadius: !isTwoDay || !isSecondDay,
          borderBottomRadius: !(isTwoDay && !isSecondDay),
          shiftDemand,
        };
        events.push(event);
      }
    });
  });
  return events;
};

export default shiftDemandsToEvents;
