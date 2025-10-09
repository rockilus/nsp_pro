/**
 * Tests for TimeNavigation component
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import dayjs from "dayjs";
import { TimeNavigation } from "./TimeNavigation";

// Mock the useTranslation hook
jest.mock("@/app/i18n/client", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        today: "Today",
        week: "Week",
        month: "Month",
      };
      return translations[key] || key;
    },
  }),
}));

describe("TimeNavigation", () => {
  const defaultProps = {
    lng: "en",
    currentPeriodStart: dayjs("2025-01-01"),
    currentPeriodEnd: dayjs("2025-01-31"),
    timeFrame: "month" as const,
    onToday: jest.fn(),
    onPreviousPeriod: jest.fn(),
    onNextPeriod: jest.fn(),
    onTimeFrameChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render all navigation controls", () => {
      render(<TimeNavigation {...defaultProps} />);

      expect(screen.getByTestId("time-nav-today")).toBeInTheDocument();
      expect(screen.getByTestId("time-nav-previous")).toBeInTheDocument();
      expect(screen.getByTestId("time-nav-next")).toBeInTheDocument();
      expect(screen.getByTestId("time-nav-label")).toBeInTheDocument();
      expect(screen.getByTestId("time-nav-select")).toBeInTheDocument();
    });

    it("should render with custom test ID prefix", () => {
      render(<TimeNavigation {...defaultProps} testIdPrefix="custom" />);

      expect(screen.getByTestId("custom-today")).toBeInTheDocument();
      expect(screen.getByTestId("custom-previous")).toBeInTheDocument();
      expect(screen.getByTestId("custom-next")).toBeInTheDocument();
    });

    it("should render with translated labels", () => {
      render(<TimeNavigation {...defaultProps} />);

      expect(screen.getByText("Today")).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Week" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Month" })).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <TimeNavigation {...defaultProps} className="custom-class" />
      );

      const navContainer = container.firstChild;
      expect(navContainer).toHaveClass("custom-class");
    });
  });

  describe("Period Label Formatting", () => {
    it("should format same month and year correctly", () => {
      render(
        <TimeNavigation
          {...defaultProps}
          currentPeriodStart={dayjs("2025-01-01")}
          currentPeriodEnd={dayjs("2025-01-31")}
        />
      );

      expect(screen.getByTestId("time-nav-label")).toHaveTextContent(
        "January 2025"
      );
    });

    it("should format different months, same year correctly", () => {
      render(
        <TimeNavigation
          {...defaultProps}
          currentPeriodStart={dayjs("2025-01-01")}
          currentPeriodEnd={dayjs("2025-02-28")}
        />
      );

      expect(screen.getByTestId("time-nav-label")).toHaveTextContent(
        "Jan - Feb 2025"
      );
    });

    it("should format different years correctly", () => {
      render(
        <TimeNavigation
          {...defaultProps}
          currentPeriodStart={dayjs("2024-12-01")}
          currentPeriodEnd={dayjs("2025-01-31")}
        />
      );

      expect(screen.getByTestId("time-nav-label")).toHaveTextContent(
        "Dec 2024 - Jan 2025"
      );
    });
  });

  describe("User Interactions", () => {
    it("should call onToday when today button is clicked", () => {
      render(<TimeNavigation {...defaultProps} />);

      fireEvent.click(screen.getByTestId("time-nav-today"));

      expect(defaultProps.onToday).toHaveBeenCalledTimes(1);
    });

    it("should call onPreviousPeriod when previous button is clicked", () => {
      render(<TimeNavigation {...defaultProps} />);

      fireEvent.click(screen.getByTestId("time-nav-previous"));

      expect(defaultProps.onPreviousPeriod).toHaveBeenCalledTimes(1);
    });

    it("should call onNextPeriod when next button is clicked", () => {
      render(<TimeNavigation {...defaultProps} />);

      fireEvent.click(screen.getByTestId("time-nav-next"));

      expect(defaultProps.onNextPeriod).toHaveBeenCalledTimes(1);
    });

    it("should call onTimeFrameChange when selector is changed to week", () => {
      render(<TimeNavigation {...defaultProps} />);

      fireEvent.change(screen.getByTestId("time-nav-select"), {
        target: { value: "week" },
      });

      expect(defaultProps.onTimeFrameChange).toHaveBeenCalledWith("week");
    });

    it("should call onTimeFrameChange when selector is changed to month", () => {
      render(<TimeNavigation {...defaultProps} timeFrame="week" />);

      fireEvent.change(screen.getByTestId("time-nav-select"), {
        target: { value: "month" },
      });

      expect(defaultProps.onTimeFrameChange).toHaveBeenCalledWith("month");
    });
  });

  describe("Loading State", () => {
    it("should disable all controls when isLoading is true", () => {
      render(<TimeNavigation {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId("time-nav-today")).toBeDisabled();
      expect(screen.getByTestId("time-nav-previous")).toBeDisabled();
      expect(screen.getByTestId("time-nav-next")).toBeDisabled();
      expect(screen.getByTestId("time-nav-select")).toBeDisabled();
    });

    it("should not call callbacks when disabled", () => {
      render(<TimeNavigation {...defaultProps} isLoading={true} />);

      fireEvent.click(screen.getByTestId("time-nav-today"));
      fireEvent.click(screen.getByTestId("time-nav-previous"));
      fireEvent.click(screen.getByTestId("time-nav-next"));

      expect(defaultProps.onToday).not.toHaveBeenCalled();
      expect(defaultProps.onPreviousPeriod).not.toHaveBeenCalled();
      expect(defaultProps.onNextPeriod).not.toHaveBeenCalled();
    });

    it("should enable all controls when isLoading is false", () => {
      render(<TimeNavigation {...defaultProps} isLoading={false} />);

      expect(screen.getByTestId("time-nav-today")).not.toBeDisabled();
      expect(screen.getByTestId("time-nav-previous")).not.toBeDisabled();
      expect(screen.getByTestId("time-nav-next")).not.toBeDisabled();
      expect(screen.getByTestId("time-nav-select")).not.toBeDisabled();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<TimeNavigation {...defaultProps} />);

      expect(screen.getByLabelText("Navigate to today")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Navigate to previous period")
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText("Navigate to next period")
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Select time frame")).toBeInTheDocument();
    });

    it("should have aria-label on period label with formatted date", () => {
      render(<TimeNavigation {...defaultProps} />);

      expect(
        screen.getByLabelText("Current period: January 2025")
      ).toBeInTheDocument();
    });
  });

  describe("Time Frame Selection", () => {
    it("should show week as selected when timeFrame is week", () => {
      render(<TimeNavigation {...defaultProps} timeFrame="week" />);

      const select = screen.getByTestId("time-nav-select") as HTMLSelectElement;
      expect(select.value).toBe("week");
    });

    it("should show month as selected when timeFrame is month", () => {
      render(<TimeNavigation {...defaultProps} timeFrame="month" />);

      const select = screen.getByTestId("time-nav-select") as HTMLSelectElement;
      expect(select.value).toBe("month");
    });
  });

  describe("Edge Cases", () => {
    it("should handle single day period", () => {
      render(
        <TimeNavigation
          {...defaultProps}
          currentPeriodStart={dayjs("2025-01-15")}
          currentPeriodEnd={dayjs("2025-01-15")}
        />
      );

      expect(screen.getByTestId("time-nav-label")).toHaveTextContent(
        "January 2025"
      );
    });

    it("should handle year boundary crossing", () => {
      render(
        <TimeNavigation
          {...defaultProps}
          currentPeriodStart={dayjs("2024-12-28")}
          currentPeriodEnd={dayjs("2025-01-03")}
        />
      );

      expect(screen.getByTestId("time-nav-label")).toHaveTextContent(
        "Dec 2024 - Jan 2025"
      );
    });
  });
});
