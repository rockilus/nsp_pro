import { createTheme } from "@mui/material/styles";

// Change this single value to adjust the delay for every Tooltip in the app.
export const TOOLTIP_ENTER_DELAY = 1000;

const theme = createTheme({
  components: {
    MuiTooltip: {
      defaultProps: {
        enterDelay: TOOLTIP_ENTER_DELAY,
      },
    },
  },
});

export default theme;
