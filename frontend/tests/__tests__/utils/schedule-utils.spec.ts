import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(utc);
dayjs.extend(isoWeek);

import { getPeriodStartEndDates } from "@/components/schedule/schedule-utils";

describe("getPeriodStartEndDates - week->month overlap behavior", () => {
  beforeAll(() => {
    // Freeze system time to 2026-03-06 UTC
    jest.useFakeTimers();
    // @ts-ignore: Jest method available in this environment
    jest.setSystemTime(new Date("2026-03-06T12:00:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("when current week includes today, switching to month returns current month (March 2026)", () => {
    // Week that contains 2026-03-06 (isoWeek starting 2026-03-02)
    const startDate = dayjs.utc("2026-03-02").startOf("isoWeek");
    const endDate = startDate.endOf("month");

    const { firstDate, lastDate } = getPeriodStartEndDates(
      "month",
      startDate,
      endDate,
    );

    expect(firstDate.format("YYYY-MM-DD")).toBe("2026-03-01");
    expect(lastDate.format("YYYY-MM-DD")).toBe("2026-03-31");
  });

  test("when current month includes today, switching to week returns current week (Mar 2-8 2026)", () => {
    // Month that contains 2026-03-06
    const startDate = dayjs.utc("2026-03-01").startOf("month");
    const endDate = dayjs.utc("2026-03-31").endOf("month");

    const { firstDate, lastDate } = getPeriodStartEndDates(
      "week",
      startDate,
      endDate,
    );

    expect(firstDate.format("YYYY-MM-DD")).toBe("2026-03-02");
    expect(lastDate.format("YYYY-MM-DD")).toBe("2026-03-08");
  });
});
