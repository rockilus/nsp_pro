import { useTranslation } from "../../../app/i18n/client";
// Types
import {
  ShiftLeaveType,
  ShiftRestType,
  ShiftT,
  ShiftType,
} from "../../../types/shift";

export const useLeaveNameDisplayed = ({ lng }: { lng: string }) => {
  const { t } = useTranslation(lng, "shift-page");

  const leaveShiftDisplayNames: {
    [key in Exclude<ShiftLeaveType, ShiftLeaveType.NONE>]: string;
  } = {
    [ShiftLeaveType.VACATION]: t("vacation"),
    [ShiftLeaveType.VACATION_MORNING]: t("vacation_morning"),
    [ShiftLeaveType.VACATION_AFTERNOON]: t("vacation_afternoon"),
    [ShiftLeaveType.SICK]: t("sick"),
    [ShiftLeaveType.SICK_MORNING]: t("sick_morning"),
    [ShiftLeaveType.SICK_AFTERNOON]: t("sick_afternoon"),
    [ShiftLeaveType.UNPAID]: t("unpaid"),
    [ShiftLeaveType.UNPAID_MORNING]: t("unpaid_morning"),
    [ShiftLeaveType.UNPAID_AFTERNOON]: t("unpaid_afternoon"),
    [ShiftLeaveType.PARENTAL_LEAVE]: t("parental_leave"),
    [ShiftLeaveType.PARENTAL_LEAVE_MORNING]: t("parental_leave_morning"),
    [ShiftLeaveType.PARENTAL_LEAVE_AFTERNOON]: t("parental_leave_afternoon"),
    [ShiftLeaveType.TRAINING]: t("training"),
    [ShiftLeaveType.TRAINING_MORNING]: t("training_morning"),
    [ShiftLeaveType.TRAINING_AFTERNOON]: t("training_afternoon"),
    [ShiftLeaveType.OTHER]: t("other"),
    [ShiftLeaveType.OTHER_MORNING]: t("other_morning"),
    [ShiftLeaveType.OTHER_AFTERNOON]: t("other_afternoon"),
  };

  const getLeaveNameDisplayed = (
    leaveType: Exclude<ShiftLeaveType, ShiftLeaveType.NONE>
  ): string => {
    return leaveShiftDisplayNames[leaveType] || t("unknown_leave_type");
  };

  return getLeaveNameDisplayed;
};

export const useRestNameDisplayed = ({ lng }: { lng: string }) => {
  const { t } = useTranslation(lng, "shift-page");

  const restShiftDisplayNames: {
    [key in Exclude<
      ShiftRestType,
      ShiftRestType.NONE | ShiftRestType.RECUPERATION
    >]: string;
  } = {
    [ShiftRestType.OFF]: t("off"),
  };

  const getRestNameDisplayed = (
    restType: Exclude<
      ShiftRestType,
      ShiftRestType.NONE | ShiftRestType.RECUPERATION
    >
  ): string => {
    return restShiftDisplayNames[restType] || t("unknown_rest_type");
  };

  return getRestNameDisplayed;
};

export const filterWorkShifts = (shifts: ShiftT[]): ShiftT[] => {
  return shifts.filter(
    (s) => s.shiftType === ShiftType.NORMAL || s.shiftType === ShiftType.DUTY
  );
};

export const orderRestShifts = (shifts: ShiftT[]): ShiftT[] => {
  return shifts.sort((a, b) => {
    if (a.restType === 1 && b.restType !== 1) {
      return -1; // a comes before b if a.restType is 1
    } else if (a.restType !== 1 && b.restType === 1) {
      return 1; // b comes before a if b.restType is 1
    } else if (a.leaveType > 0 && b.leaveType > 0) {
      return a.leaveType - b.leaveType; // Order by increasing leaveType value
    } else if (a.leaveType > 0) {
      return -1; // a comes before b
    } else if (b.leaveType > 0) {
      return 1; // b comes before a
    } else {
      return 0; // No particular order for leaveType 0
    }
  });
};

export const filterRestShifts = (shifts: ShiftT[]): ShiftT[] => {
  return orderRestShifts(
    shifts.filter(
      (s) => s.shiftType === ShiftType.REST || s.shiftType === ShiftType.LEAVE
    )
  );
};

export const filterRestShiftsNonDefault = (shifts: ShiftT[]): ShiftT[] => {
  return shifts.filter(
    (s) =>
      (s.shiftType === ShiftType.REST || s.shiftType === ShiftType.LEAVE) &&
      s.leaveType === ShiftLeaveType.NONE &&
      s.restType !== ShiftRestType.OFF
  );
};

export const filterDutyShifts = (shifts: ShiftT[]): ShiftT[] => {
  return shifts.filter((s) => s.shiftType === ShiftType.DUTY);
};
