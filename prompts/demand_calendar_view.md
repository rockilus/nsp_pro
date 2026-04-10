# Request for Staffing Requirements Table Implementation

I'd like you to enhance the `RequestCalendar` component by adding a staffing requirements table below the existing calendar. Here's what I need:

## Component Additions

### New Props

- `shifts?: ShiftT[]` — Array of shift objects
- `demands?: DailyShiftDemandT[]` — Array of daily shift demand objects
- `showStaffingRequirements?: boolean` — Optional toggle for the staffing table

### Staffing Requirements Table

- Position it below the existing calendar
- Each row represents a shift (from the `shifts` array)
- Each column represents a day (matching the days in the calendar above)
- Column headers should be identical to and perfectly aligned with the calendar above
- Row headers should display the shift name

### Cell Values

- Each cell should display the total staffing requirement for that shift on that day
- Calculate this as:  
  `sum of demand counts for that day and shift × sum of staffing values for that shift`
- For each day and shift, compute:

staffingRequirement = sum(demands where date matches day and shiftId matches shift.id).count × sum(shift.staffing[].staffing)


### Styling

- Match the styling of the existing calendar
- Ensure perfect column alignment between the calendar and staffing table
- Consider using a slightly different background color to distinguish it from the leave calendar

## Implementation Notes

- Reuse the existing calendar header to maintain alignment
- Consider implementing a divider or label between the two tables
- Make the staffing table optional with the `showStaffingRequirements` prop
- Add appropriate loading/empty states

---

Could you implement these changes to my `RequestCalendar` component?