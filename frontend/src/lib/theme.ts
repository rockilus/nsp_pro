import { createTheme } from '@mui/material/styles';

// Change this single value to adjust the delay for every Tooltip in the app.
export const TOOLTIP_ENTER_DELAY = 1000;

const theme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Use CSS variables so dark mode works — CssBaseline hardcodes #fff otherwise
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterDelay: TOOLTIP_ENTER_DELAY,
      },
    },
  },
});

export default theme;
