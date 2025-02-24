import * as React from 'react';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Unstable_DateField as DateField } from '@mui/x-date-pickers/DateField';

export default function LifeCycleDateFieldEmpty() {
  const [value, setValue] = React.useState(null);

  return (
    <Stack spacing={2}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DateField value={value} onChange={(newValue) => setValue(newValue)} />
      </LocalizationProvider>
      <Typography>Value: {value == null ? 'null' : value.format('L')}</Typography>
    </Stack>
  );
}
