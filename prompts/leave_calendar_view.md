You are an expert React component developer. Your task is to create a scheduling component that displays employee leave requests for a given month, similar to the provided screenshot from the 'Combo' app.

**Component Requirements:**

1.  **Layout:**
    * A monthly calendar header displaying the days of the month (1-31). The header should clearly indicate the day of the week (M, T, W, T, F, S, S for Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, respectively, as in the screenshot).
    * A list of employee names on the left-hand side, acting as row headers.
    * A grid area where leave requests are visually represented against the calendar days for each employee.

2.  **Input Props:**
    * `workers`: An array of WorkerT objects, where each object represents a worker and has a `name` property.
    * `requests`: An array of RequestT objects, where each object represents a leave request and has at least the following properties:
        * `workerId`: The ID of the worker associated with the request.
        * `startDate`: The start date of the leave (a `dayjs` object).
        * `endDate`: The end date of the leave (a `dayjs` object).
        * `status`: A string indicating the status of the request (e.g., `'pending'`, `'accepted'`, `'denied'`).
        * `fulfillment`: A string indicating if the request was fulfilled (e.g. `'not_processed', 'fulfilled', 'unfulfilled'`, )
    * `currentMonth`: A `dayjs` object representing the month to display (e.g., `dayjs('2025-02-01')` for February 2025).

3.  **Functionality:**
    * **Calendar Generation:** Dynamically generate the days for the `currentMonth`.
    * **Leave Visualization:** For each leave request, render a colored block or cell in the grid corresponding to the worker and the days of their leave.
    * **Color Coding:** Implement color coding based on the `status` of the leave request:
        * 'pending' (Demandes à traiter): orange background.
        * 'accepted' (Demandes acceptées): Green background.
        * 'created' (Absences créées sur le planning): Blue background.
        * *Optional:* Allow for custom colors via a `statusColors` prop (e.g., `{'pending': '#FFC107', 'accepted': '#4CAF50', 'created': '#2196F3'}`).
    * **Hover/Tooltip (Optional but recommended):** When hovering over a leave block, display details about the leave request (e.g., start date, end date, status).
    * **Empty Days:** Days without leave requests should remain empty or display a default background.

4.  **Styling:**
    * Use a clean, modern UI similar to the screenshot.
    * Ensure good readability for employee names and dates.
    * The grid lines should be subtle but clear.

5.  **Assumptions:**
    * You will use `flexbox` or `CSS Grid` for layout.
    * The component should be responsive to some degree.

**Provide the full component code (HTML/JSX/Vue Template, CSS, and JavaScript/TypeScript logic) for this component, making sure to include example usage and any necessary imports.**

**Choose one of the following frameworks:**
* **React**

**Example Data Structure:**
