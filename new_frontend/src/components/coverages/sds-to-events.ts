import dayjs from "dayjs";
// Types
import {
  ShiftDemandT,
  EventT,
  ShiftDemandCalendarT,
} from "../../types/coverage";

const shiftDemandsToEvents = (shiftDemands: ShiftDemandT[]): EventT[] => {
  const out: EventT[] = [];
  // Convert ShiftDemandT to ShiftDemandCalendarT and duplicate two days shifts
  const shiftDemandsCalendar = buildShiftDemandCalendar(shiftDemands);
  // Group shift demands by day index
  const groupedShiftDemands = groupByDayIndex(shiftDemandsCalendar);
  // Iterate over each day
  groupedShiftDemands.forEach((group, dayIndex) => {
    // const overlapIdGroups = groupOverlappingShifts(group);
    // const events = convertShiftDemandToEvent(group, overlapIdGroups);
    const overlappingDict = buildOverlappingDict(group);
    const convertedDict = covertOverlappingDictToShiftNames(
      overlappingDict,
      shiftDemandsCalendar
    );
    console.log("convertedDict", convertedDict);

    const events = convertShiftDemandToEvent(group, overlappingDict);
    out.push(...events);
  });
  return out;
};

const getShiftNameByShiftDemandId = (
  id: string,
  shiftDemands: ShiftDemandCalendarT[]
): string => {
  return shiftDemands.find((sd) => sd.id === id)?.shift.name ?? "";
};

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
        startTime: setDayJSDate(shiftDemand.shift.startTime),
        endTime: setDayJSDate(shiftDemand.shift.endTime),
      });
    } else {
      out.push({
        ...shiftDemand,
        isTwoDays,
        isSecondDay: false,
        startTime: setDayJSDate(shiftDemand.shift.startTime),
        endTime: setDayJSDate(shiftDemand.shift.startTime.endOf("day")),
      });
      out.push({
        ...shiftDemand,
        isTwoDays,
        isSecondDay: true,
        dayIndex: (shiftDemand.dayIndex + 1) % 7,
        startTime: setDayJSDate(shiftDemand.shift.endTime.startOf("day")),
        endTime: setDayJSDate(shiftDemand.shift.endTime),
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

// const buildOverlappingDict = (
//   shiftDemands: ShiftDemandCalendarT[]
// ): Map<string, string[][]> => {
//   const overlappingDict = new Map<string, string[][]>();

//   // Iterate over all shift demands
//   for (let i = 0; i < shiftDemands.length; i++) {
//     const currentShiftDemand = shiftDemands[i];
//     let maxStartTime = setDayJSDate(currentShiftDemand.startTime);
//     let minEndTime = setDayJSDate(currentShiftDemand.endTime);
//     const overlappingShifts = [currentShiftDemand.id];

//     // Compare with the other shift demands
//     for (let j = 0; j < shiftDemands.length; j++) {
//       if (i !== j) {
//         const otherShiftDemand = shiftDemands[j];
//         const otherSDStartTimeSameDay = setDayJSDate(
//           otherShiftDemand.startTime
//         );
//         const otherSDEndTimeSameDay = setDayJSDate(otherShiftDemand.endTime);

//         // Check if they overlap
//         if (
//           otherSDStartTimeSameDay.isBefore(minEndTime) &&
//           otherSDEndTimeSameDay.isAfter(maxStartTime)
//         ) {
//           overlappingShifts.push(otherShiftDemand.id);
//           maxStartTime = maxStartTime.isAfter(otherSDStartTimeSameDay)
//             ? maxStartTime
//             : otherSDStartTimeSameDay;
//           minEndTime = minEndTime.isBefore(otherSDEndTimeSameDay)
//             ? minEndTime
//             : otherSDEndTimeSameDay;
//         }
//       }
//     }

//     // Sort the array to prevent different orders being considered unique
//     overlappingShifts.sort();

//     // Check if this group already exists or is a subset of another
//     const isSubsetOrDuplicate =
//       overlappingDict
//         .get(currentShiftDemand.id)
//         ?.some((existingGroup) =>
//           overlappingShifts.every((id) => existingGroup.includes(id))
//         ) ?? false;

//     // Add the group if it's unique
//     if (!isSubsetOrDuplicate) {
//       if (overlappingDict.has(currentShiftDemand.id)) {
//         // If the key exists, append overlappingShifts to the existing array
//         const existingArray = overlappingDict.get(currentShiftDemand.id);
//         if (existingArray) {
//           existingArray.push(overlappingShifts);
//         }
//       } else {
//         // If the key does not exist, create a new entry with the key and value
//         overlappingDict.set(currentShiftDemand.id, [overlappingShifts]);
//       }
//     }
//   }

//   return overlappingDict;
// };

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

const orderOverlappingEvents = (
  events: EventT[],
  overlapIdGroups: string[][]
): EventT[] => {
  // Sort events by maxOverlap and durationHour
  events.sort((a, b) => {
    if (b.maxOverlap !== a.maxOverlap) {
      return b.maxOverlap - a.maxOverlap;
    }
    return b.durationHour - a.durationHour;
  });
  // Build array of overlapping events
  const overlapEventsGroups = overlapIdGroups.map((group) =>
    group.map((id) => events.find((event) => event.shiftDemand.id === id)!)
  );
  events.map((event) => {
    const groupsIncludeEvent = overlapEventsGroups.filter((group) =>
      group.some((e) => e.shiftDemand.id === event.shiftDemand.id)
    );
    groupsIncludeEvent.forEach((group) => {});
  });

  overlapEventsGroups.forEach((group, index) => {
    const groupEvents = events.filter((event) =>
      group.includes(event.shiftDemand.id)
    );
  });
};

function findKeyWithLongestSubarray(
  overlappingDict: Map<string, string[][]>,
  convertedToEvents: string[]
): string | null {
  let longestKeys: string[] = [];
  let longestKey: string | null = null;
  let longestSubarrayLength = 0;
  let longestValueLength = 0;

  overlappingDict.forEach((value, key) => {
    if (convertedToEvents.includes(key)) {
      return; // Skip this iteration and move to the next key-value pair
    }
    value.forEach((subarray) => {
      if (subarray.length > longestSubarrayLength) {
        longestKeys = [key];
        longestSubarrayLength = subarray.length;
      } else if (subarray.length === longestSubarrayLength) {
        longestKeys.push(key);
      }
    });
  });

  if (longestKeys.length === 0) {
    return null; // Return null if the map is empty
  } else if (longestKeys.length === 1) {
    return longestKeys[0]; // Return the only key if there is only one
  } else {
    longestKeys.forEach((key) => {
      const value = overlappingDict.get(key);
      if (value && value.length > longestValueLength) {
        longestKey = key;
        longestValueLength = value.length;
      }
    });
    return longestKey;
  }
}

const findItemInLongestArrayRepeating = (
  overlappingArray: string[][],
  convertedToEvent: string[]
): string | null => {
  let longestArrays: string[][] = [];
  let longestArrayLength: number = 0;
  let mostRepeatItem: string | null = null;
  let mostRepeatItemRepeat: number = 0;

  overlappingArray.forEach((array) => {
    if (array.every((id) => convertedToEvent.includes(id))) {
      return; // Skip this iteration and move to the next array
    }
    if (array.length > longestArrayLength) {
      longestArrays = [array];
      longestArrayLength = array.length;
    } else if (array.length === longestArrayLength) {
      longestArrays.push(array);
    }
  });

  longestArrays.forEach((array) => {
    array.forEach((item) => {
      const repeat = overlappingArray.filter((a) => a.includes(item)).length;
      if (repeat > mostRepeatItemRepeat) {
        mostRepeatItem = item;
        mostRepeatItemRepeat = repeat;
      }
    });
  });
};

const findKeyWithLongestArray = (
  overlappingDict: Map<string, string[]>,
  convertedToEvent: string[]
): string | null => {
  let longestKey: string | null = null;
  let longestLength = 0;

  overlappingDict.forEach((value, key) => {
    if (!convertedToEvent.includes(key) && value.length > longestLength) {
      longestKey = key;
      longestLength = value.length;
    }
  });

  return longestKey;
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
    // console.log("key", key);
    // console.log("value", value);

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
    if (length >= maxOverlapGroups) {
      maxOverlapGroups = length;
      // out = key;
      if (numOverlapGroupsOfTargetLength > maxTargetLengthOverlapGroups) {
        maxTargetLengthOverlapGroups = numOverlapGroupsOfTargetLength;
        out = key;
      }
    }
  });
  // console.log("out", out);

  return out;
};

const getIndexPosition = (
  currentOverlaps: string[][],
  events: EventT[],
  maxOverlaps: number
): number | null => {
  const currentEvents: EventT[] = [];
  currentOverlaps.forEach((array) => {
    const eventsInArray = events.filter((event) =>
      array.includes(event.shiftDemand.id)
    );
    eventsInArray.forEach((event) => {
      if (
        !currentEvents.find((e) => e.shiftDemand.id === event.shiftDemand.id)
      ) {
        currentEvents.push(event);
      }
    });
  });
  console.log("maxOverlaps", maxOverlaps);
  console.log("currentEvents", currentEvents);

  for (let i = 0; i < maxOverlaps; i++) {
    const isIndexUsed = currentEvents.some(
      (event) => event.indexPosition === i
    );
    if (!isIndexUsed) {
      return i;
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
  const shiftDemandOverlaps = overlappingDict.get(shiftDemandId) ?? [];
  const maxOverlaps = getLengthLongestSubarrayInArray(shiftDemandOverlaps) + 1;
  const indexPosition = getIndexPosition(
    shiftDemandOverlaps,
    events,
    maxOverlaps
  );
  if (indexPosition === null) {
    return null;
  }
  return {
    startHour:
      shiftDemand.startTime.hour() + shiftDemand.startTime.minute() / 60,
    durationHour:
      shiftDemand.endTime.diff(shiftDemand.startTime, "minute", true) / 60,
    startXNumerator: 0,
    startXDenominator: maxOverlaps,
    widthNumerator: 1,
    widthDenominator: maxOverlaps,
    indexPosition: indexPosition,
    maxOverlap: maxOverlaps,
    borderTopRadius: !shiftDemand.isTwoDays || !shiftDemand.isSecondDay,
    borderBottomRadius: !(shiftDemand.isTwoDays && !shiftDemand.isSecondDay),
    shiftDemand: shiftDemandCalendarToShiftDemand(shiftDemand),
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
    console.log(
      "currentOverlapLength value at end of loop: ",
      currentOverlapLength
    );
  }
  return events;
};

export default shiftDemandsToEvents;
