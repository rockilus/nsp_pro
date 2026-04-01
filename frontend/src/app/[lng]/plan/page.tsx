'use client';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
// Styles
import '../../../styles/page.css';

export default function Page() {
  return (
    <div className="page-layout">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <p>Plan Page</p>
      </LocalizationProvider>
    </div>
  );
}
