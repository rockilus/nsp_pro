import dayjs from "dayjs";
// Types
import {
  ShiftDemandT,
  EventT,
  ShiftDemandCalendarT,
} from "../../../types/coverage";
import { ShiftT } from "../../../types/shift";

const shiftDemandsToEvents = (
  shiftDemands: ShiftDemandT[],
  shifts: ShiftT[]
): EventT[] => {
  const out: EventT[] = [];
  // Convert ShiftDemandT to ShiftDemandCalendarT and duplicate two days shifts
  const shiftDemandsCalendar = buildShiftDemandCalendar(shiftDemands, shifts);
  // Group shift demands by day index
  const groupedShiftDemands = groupByDayIndex(shiftDemandsCalendar);
  // Iterate over each day
  groupedShiftDemands.forEach((group, dayIndex) => {
    const overlappingDict = buildOverlappingDict(group);

    const convertedDict = covertOverlappingDictToShiftNames(
      overlappingDict,
      shiftDemandsCalendar
    );

    const events = convertShiftDemandToEvent(group, overlappingDict);
    out.push(...events);
  });

  // const shiftNameToEventDict = buildShiftNameToEventDict(out);
  // console.log("shiftNameToEventDict", shiftNameToEventDict);

  return out;
};

const getShiftNameByShiftDemandId = (
  id: string,
  shiftDemands: ShiftDemandCalendarT[]
): string => {
  return shiftDemands.find((sd) => sd.id === id)?.shift.name ?? "";
};

const buildShiftDemandCalendar = (
  shiftDemands: ShiftDemandT[],
  shifts: ShiftT[]
): ShiftDemandCalendarT[] => {
  const out: ShiftDemandCalendarT[] = [];
  shiftDemands.forEach((shiftDemand) => {
    const shift = shifts.find((s) => s.id === shiftDemand.shiftId);
    if (!shift) {
      return;
    }
    const isTwoDays = shift.startTime.day() !== shift.endTime.day();
    if (!isTwoDays) {
      out.push({
        ...shiftDemand,
        shift,
        isTwoDays,
        isSecondDay: false,
        startTime: setDayJSDate(shift.startTime),
        endTime: setDayJSDate(shift.endTime),
      });
    } else {
      out.push({
        ...shiftDemand,
        shift,
        isTwoDays,
        isSecondDay: false,
        startTime: setDayJSDate(shift.startTime),
        endTime: setDayJSDate(shift.startTime.endOf("day")),
      });
      out.push({
        ...shiftDemand,
        shift,
        isTwoDays,
        isSecondDay: true,
        dayIndex: (shiftDemand.dayIndex + 1) % 7,
        startTime: setDayJSDate(shift.endTime.startOf("day")),
        endTime: setDayJSDate(shift.endTime),
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
    shiftId: shiftDemand.shift.id,
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

const isSubsetMethod = (arr1: string[], arr2: string[]): boolean => {
  const isSubset = arr1.every((item) => arr2.includes(item));
  return arr1.length !== arr2.length && isSubset;
};
const isDuplicateMethod = (arr1: string[], arr2: string[]): boolean => {
  // Check if arr1 is a subset of arr2
  const isSubset = arr1.every((item) => arr2.includes(item));
  // Check if arr1 is a duplicate of arr2
  return arr1.length === arr2.length && isSubset;
};

const buildOverlappingDict = (
  shiftDemands: ShiftDemandCalendarT[]
): Map<string, string[][]> => {
  const overlappingDict = new Map<string, string[][]>();
  shiftDemands.forEach((shiftDemand) => {
    const overlappingGroups: string[][] = [];
    const overlappingGroupsWithDuplicates: string[][] = [];
    const times = [];
    const interval = 5 * 60 * 1000; // 5 minutes in milliseconds
    for (
      let time = shiftDemand.startTime.valueOf();
      time <= shiftDemand.endTime.valueOf();
      time += interval
    ) {
      times.push(dayjs(time));
    }
    times.forEach((time) => {
      const overlaps: string[] = [];
      shiftDemands
        .filter((sd) => sd.id !== shiftDemand.id)
        .forEach((sd) => {
          if (sd.startTime.isBefore(time) && sd.endTime.isAfter(time)) {
            overlaps.push(sd.id);
          }
        });
      overlaps.sort();
      overlappingGroupsWithDuplicates.push(overlaps);
    });

    for (let i = 0; i < overlappingGroupsWithDuplicates.length; i++) {
      const currentGroup = overlappingGroupsWithDuplicates[i];
      let isASubset = false;
      for (let j = 0; j < overlappingGroupsWithDuplicates.length; j++) {
        if (i !== j) {
          const otherGroup = overlappingGroupsWithDuplicates[j];
          const isSubset = isSubsetMethod(currentGroup, otherGroup);
          if (isSubset) {
            isASubset = true;
            break;
          }
        }
      }
      if (!isASubset) {
        let exist = false;
        for (let j = 0; j < overlappingGroups.length; j++) {
          const existingGroup = overlappingGroups[j];
          const isDuplicate = isDuplicateMethod(currentGroup, existingGroup);
          if (isDuplicate) {
            exist = true;
            break;
          }
        }
        if (!exist) {
          overlappingGroups.push(currentGroup);
        }
      }
      overlappingDict.set(shiftDemand.id, overlappingGroups);
      // overlappingDict.set(shiftDemand.id, overlappingGroupsWithDuplicates);
    }
  });

  return overlappingDict;
};

const getLengthLongestSubarrayInArray = (array: string[][]): number => {
  let maxLength = 0;

  array.forEach((array) => {
    if (array.length > maxLength) {
      maxLength = array.length;
    }
  });

  return maxLength;
};

const getLengthLongestSubarrayInDict = (
  dict: Map<string, string[][]>
): number => {
  let maxLength = 0;

  dict.forEach((value) => {
    const length = getLengthLongestSubarrayInArray(value);
    if (length > maxLength) {
      maxLength = length;
    }
  });

  return maxLength;
};

const getSDwithMostOverlapGroups = (
  overlappingDict: Map<string, string[][]>,
  convertedToEvent: string[],
  targetLength: number
): string | null => {
  let maxOverlapGroups: number = 0;
  let maxTargetLengthOverlapGroups: number = 0;
  let out: string | null = null;

  overlappingDict.forEach((value, key) => {
    const numOverlapGroupsOfTargetLength = value.filter(
      (array) => array.length === targetLength
    ).length;
    if (
      convertedToEvent.includes(key) ||
      numOverlapGroupsOfTargetLength === 0
    ) {
      return;
    }
    const length = value.length;
    if (length > maxOverlapGroups) {
      maxOverlapGroups = length;
      maxTargetLengthOverlapGroups = numOverlapGroupsOfTargetLength;
      out = key;
    } else if (length === maxOverlapGroups) {
      if (numOverlapGroupsOfTargetLength > maxTargetLengthOverlapGroups) {
        maxTargetLengthOverlapGroups = numOverlapGroupsOfTargetLength;
        out = key;
      }
    }
  });
  return out;
};

const getMaxOverlap = (events: EventT[]): number => {
  let maxOverlap: number = 0;

  events.forEach((event) => {
    if (event.maxOverlap > maxOverlap) {
      maxOverlap = event.maxOverlap;
    }
  });

  return maxOverlap;
};

const getLargestAvailableWidth = (
  indexPosition: number,
  events: EventT[],
  maxOverlap: number
): number => {
  let largestAvailableWidth: number = 0;
  let widthLeftUsed: number = 0;
  for (let i = 0; i < maxOverlap; i++) {
    const eventWithIndex = events.find((event) => event.startXNumerator === i);
    if (eventWithIndex && i < indexPosition) {
      widthLeftUsed += eventWithIndex.widthNumerator;
    } else if (!eventWithIndex && i >= indexPosition) {
      largestAvailableWidth++;
    } else if (eventWithIndex && i >= indexPosition) {
      return largestAvailableWidth;
    }
  }
  return largestAvailableWidth;
};

const getHorizontalLocationParams = (
  shiftDemandId: string,
  overlappingDict: Map<string, string[][]>,
  events: EventT[]
): {
  startXNumerator: number;
  startXDenominator: number;
  widthNumerator: number;
  widthDenominator: number;
  indexPosition: number;
  maxOverlap: number;
} | null => {
  const currentEvents: EventT[] = [];
  let longestOverlapConvertedToEvents: boolean = false;
  const longestOverlapEvents: EventT[] = [];

  const currentOverlaps = overlappingDict.get(shiftDemandId) ?? [];
  const maxOverlaps = getLengthLongestSubarrayInArray(currentOverlaps) + 1;

  currentOverlaps.forEach((array) => {
    const eventsInArray = events.filter((event) =>
      array.includes(event.shiftDemand.id)
    );
    if (eventsInArray.length === maxOverlaps - 1) {
      longestOverlapConvertedToEvents = true;
      longestOverlapEvents.push(...eventsInArray);
    }
    eventsInArray.forEach((event) => {
      if (
        !currentEvents.find((e) => e.shiftDemand.id === event.shiftDemand.id)
      ) {
        currentEvents.push(event);
      }
    });
  });
  const maxOverlapsAdjacentEvents = Math.max(
    maxOverlaps,
    getMaxOverlap(currentEvents)
  );
  for (let i = 0; i < maxOverlaps; i++) {
    const isIndexUsed = currentEvents.some(
      (event) => event.indexPosition === i
    );
    // if (shiftDemandId === "66cdc25936a18b21829be1a7") {
    //   console.log("TEST 4");
    //   console.log("isIndexUsed", isIndexUsed);
    //   console.log("i", i);
    //   console.log("currentEvents", currentEvents);
    //   console.log(
    //     "longestOverlapConvertedToEvents",
    //     longestOverlapConvertedToEvents
    //   );
    //   console.log("longestOverlapEvents", longestOverlapEvents);
    //   console.log("maxOverlapsAdjacentEvents", maxOverlapsAdjacentEvents);
    //   console.log("maxOverlaps", maxOverlaps);
    // }
    if (!isIndexUsed) {
      if (!longestOverlapConvertedToEvents) {
        return {
          startXNumerator: i,
          startXDenominator: maxOverlapsAdjacentEvents,
          widthNumerator: 1,
          widthDenominator: maxOverlapsAdjacentEvents,
          indexPosition: i,
          maxOverlap: maxOverlaps,
        };
      } else {
        return {
          startXNumerator: i,
          startXDenominator: maxOverlapsAdjacentEvents,
          widthNumerator: getLargestAvailableWidth(
            i,
            longestOverlapEvents,
            maxOverlapsAdjacentEvents
          ),
          widthDenominator: maxOverlapsAdjacentEvents,
          indexPosition: i,
          maxOverlap: maxOverlaps,
        };
      }
    }
  }
  return null;
};

const createEvent = (
  shiftDemandId: string,
  shiftDemands: ShiftDemandCalendarT[],
  overlappingDict: Map<string, string[][]>,
  events: EventT[]
): EventT | null => {
  const shiftDemand = shiftDemands.find((sd) => sd.id === shiftDemandId);
  if (!shiftDemand) {
    return null;
  }
  const horizontalLocationParams = getHorizontalLocationParams(
    shiftDemandId,
    overlappingDict,
    events
  );
  if (horizontalLocationParams === null) {
    return null;
  }
  const {
    startXNumerator,
    startXDenominator,
    widthNumerator,
    widthDenominator,
    indexPosition,
    maxOverlap,
  } = horizontalLocationParams;
  return {
    startHour:
      shiftDemand.startTime.hour() + shiftDemand.startTime.minute() / 60,
    durationHour:
      shiftDemand.endTime.diff(shiftDemand.startTime, "minute", true) / 60,
    startXNumerator: startXNumerator,
    startXDenominator: startXDenominator,
    widthNumerator: widthNumerator,
    widthDenominator: widthDenominator,
    indexPosition: indexPosition,
    maxOverlap: maxOverlap,
    borderTopRadius: !shiftDemand.isTwoDays || !shiftDemand.isSecondDay,
    borderBottomRadius: !(shiftDemand.isTwoDays && !shiftDemand.isSecondDay),
    shiftDemand: shiftDemandCalendarToShiftDemand(shiftDemand),
    shift: shiftDemand.shift,
  };
};

function countNonConvertedSDs(
  currentOverlaps: string[][],
  convertedEvents: string[]
): number {
  let count = 0;

  currentOverlaps.forEach((array) => {
    array.forEach((SDId) => {
      if (!convertedEvents.includes(SDId)) {
        count++;
      }
    });
  });

  return count;
}

const convertShiftDemandToEvent = (
  shiftDemands: ShiftDemandCalendarT[],
  overlappingDict: Map<string, string[][]>
): EventT[] => {
  const events: EventT[] = [];
  const convertedToEvent: string[] = [];

  // 1 - Get the length of the largest overlap overall
  let currentOverlapLength = getLengthLongestSubarrayInDict(overlappingDict);
  while (currentOverlapLength >= 0) {
    // 2 - Create events for all the shift demands in the largest overlaps in order of
    // descending number of overlaps groups, and then in order of descending number of
    // paticipation to the largest overlaps groups
    while (true) {
      const currentSDId = getSDwithMostOverlapGroups(
        overlappingDict,
        convertedToEvent,
        currentOverlapLength
      );
      if (!currentSDId) {
        break;
      }
      const newEvent = createEvent(
        currentSDId,
        shiftDemands,
        overlappingDict,
        events
      );
      if (!newEvent) {
        continue;
      }
      events.push(newEvent);
      convertedToEvent.push(currentSDId);
    }

    // 3 - Check if there is any shift demand with all its overlaps converted to
    // events, and convert it to an event
    while (true) {
      let convertedAShiftDemand: boolean = false;
      overlappingDict.forEach((value, key) => {
        if (convertedToEvent.includes(key)) {
          return;
        }
        const nonConvertedSDsCount = countNonConvertedSDs(
          value,
          convertedToEvent
        );
        if (nonConvertedSDsCount === 0) {
          const newEvent = createEvent(
            key,
            shiftDemands,
            overlappingDict,
            events
          );
          if (!newEvent) {
            return;
          }
          events.push(newEvent);
          convertedToEvent.push(key);
          convertedAShiftDemand = true;
        }
      });
      if (!convertedAShiftDemand) {
        break;
      }
    }
    // 4 - Repeat steps 1-4 until all shift demands are converted to events
    const allShiftDemandsConverted = Array.from(overlappingDict.keys()).every(
      (key) => convertedToEvent.includes(key)
    );
    if (allShiftDemandsConverted) {
      break;
    }
    currentOverlapLength--;
  }
  return events;
};

////////////////////////////////////////
// For debugguging purposes
////////////////////////////////////////
const covertOverlappingDictToShiftNames = (
  overlappingDict: Map<string, string[][]>,
  shiftDemands: ShiftDemandCalendarT[]
): Map<string, string[][]> => {
  const convertedDict = new Map<string, string[][]>();

  overlappingDict.forEach((value, key) => {
    const newValue = value.map((array) =>
      array.map((id) => getShiftNameByShiftDemandId(id, shiftDemands))
    );
    convertedDict.set(getShiftNameByShiftDemandId(key, shiftDemands), newValue);
  });

  return convertedDict;
};

const buildShiftNameToEventDict = (events: EventT[]): Map<string, EventT[]> => {
  const out = new Map<string, EventT[]>();
  events.forEach((event) => {
    const shiftName = event.shift.name;
    if (!out.has(shiftName)) {
      out.set(shiftName, []);
    }
    out.get(shiftName)!.push(event);
  });
  return out;
};

export default shiftDemandsToEvents;
