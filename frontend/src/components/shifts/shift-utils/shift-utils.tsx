import { useTranslation } from "../../../app/i18n/client";
// Types
import { ShiftLeaveType } from "../../../types/shift";

const useLeaveNameDisplayed = ({ lng }: { lng: string }) => {
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
  ) => {
    return leaveShiftDisplayNames[leaveType] || t("unknown_leave_type");
  };

  return getLeaveNameDisplayed;
};

export default useLeaveNameDisplayed;
