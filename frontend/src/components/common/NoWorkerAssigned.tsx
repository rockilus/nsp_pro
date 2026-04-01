import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface NoWorkerAssignedProps {
  message: string;
  /** Height of the centred wrapper. Defaults to "400px" for desktop layouts.
   *  Pass "calc(100vh - 128px)" for full-screen mobile layouts. */
  minHeight?: string;
}

export default function NoWorkerAssigned({ message, minHeight = '400px' }: NoWorkerAssignedProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight,
        p: 4,
      }}
    >
      <Alert severity="info" data-testid="no-worker-alert" sx={{ maxWidth: '600px' }}>
        <Typography variant="body1">{message}</Typography>
      </Alert>
    </Box>
  );
}
