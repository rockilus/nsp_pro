import React from "react";
// Styles
import "./request-cell.css";
// Types
import {
  RequestT,
  RequestType,
  RequestStatus,
  FulfillmentStatus,
} from "../../../../types/request";
import { ShiftT } from "../../../../types/shift";
// Utils
import {
  getRequestTargetDisplayText,
  getShiftColors,
} from "../../../../utils/shift-worker-option-display";

export default function RequestCell({
  request,
  shifts,
}: {
  request: RequestT | null;
  shifts: ShiftT[];
}) {
  if (!request) {
    return null; // Don't render anything if there's no request
  }

  // Get shift colors for CSS variables (uses utility function)
  const shiftColors = getShiftColors(request, shifts);

  // Get emoji indicators for the request
  const getRequestEmojis = () => {
    const emojis: string[] = [];

    // Work request type indicator (negative vs positive)
    if (request.requestType === RequestType.WORK_DEMAND) {
      if (request.negative) {
        emojis.push("🙅"); // Person gesturing no
      } else {
        emojis.push("🙋"); // Person raising one hand
      }
    }

    // Fulfillment indicator (only show for approved requests)
    if (request.status === RequestStatus.APPROVED) {
      switch (request.fulfillment) {
        case FulfillmentStatus.FULFILLED:
          emojis.push("✅"); // Check mark
          break;
        case FulfillmentStatus.UNFULFILLED:
          emojis.push("❌"); // Cross mark
          break;
      }
    }

    return emojis.join(" ");
  };

  const requestEmojis = getRequestEmojis();

  // Get status-specific CSS class
  const getStatusClass = () => {
    switch (request.status) {
      case RequestStatus.PENDING:
        return " rc-container--status-pending";
      case RequestStatus.DENIED:
        return " rc-container--status-denied";
      case RequestStatus.APPROVED:
      default:
        return "";
    }
  };

  // Build the tooltip content
  const getTitle = () => {
    const targetText = getRequestTargetDisplayText(request, [], shifts, "not");

    const periodText = request.startDate.isSame(request.endDate, "day")
      ? request.startDate.format("DD MMM").toLowerCase()
      : `${request.startDate.format("DD MMM").toLowerCase()} - ${request.endDate
          .format("DD MMM")
          .toLowerCase()}`;

    const statusEmoji = (() => {
      switch (request.status) {
        case RequestStatus.PENDING:
          return "🟠";
        case RequestStatus.APPROVED:
          return "🟢";
        case RequestStatus.DENIED:
          return "🔴";
        default:
          return "";
      }
    })();

    const fulfillmentEmoji = (() => {
      switch (request.fulfillment) {
        case FulfillmentStatus.FULFILLED:
          return "✅";
        case FulfillmentStatus.UNFULFILLED:
          return "❌";
        default:
          return "";
      }
    })();

    let tooltip = `📆 ${periodText}\n${targetText}\n${statusEmoji} ${request.status}`;

    // Only show fulfillment status if the request has been approved
    if (request.status === RequestStatus.APPROVED) {
      tooltip += `\n${fulfillmentEmoji} ${request.fulfillment}`;
    }

    if (request.comment) {
      tooltip += `\nComment: ${request.comment}`;
    }

    return tooltip;
  };

  return (
    <div
      className={`rc-container${getStatusClass()}`}
      style={
        {
          ...(shiftColors && {
            "--shift-bg-color": shiftColors.background,
            "--shift-sample-color": shiftColors.sample,
            "--shift-text-color": shiftColors.text,
            background: shiftColors.background,
            color: shiftColors.text,
          }),
        } as React.CSSProperties
      }
      title={getTitle()}
    >
      {requestEmojis && <div className="rc-emojis">{requestEmojis}</div>}
    </div>
  );
}
