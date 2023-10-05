import React, { ChangeEvent, useState } from 'react';
import QueryFilter from './QueryFilter';
import { FormControl, InputLabel, Select, MenuItem, TextField, Button, SelectChangeEvent } from '@mui/material';

function getAnyDayOptions() {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return ['Any day', ...daysOfWeek];
}

type ConstraintBuilderProps = {
  data: Config;
  onConstraintReady: (constraint: any) => void;
};

const ConstraintBuilder: React.FC<ConstraintBuilderProps> = ({ data, onConstraintReady }) => {
  const [constraintName, setConstraintName] = useState<string>('');
  const [whenConditions, setWhenConditions] = useState<QueryFilter[]>([]);
  const [thenConditions, setThenConditions] = useState<QueryFilter[]>([]);
  const [anyDay, setAnyDay] = useState('');
  const [relativeDay, setRelativeDay] = useState('');

  const handleWhenFiltersReady = (filters: QueryFilter[]) => {
    setWhenConditions(filters);
  };

  const handleThenFiltersReady = (filters: QueryFilter[]) => {
    setThenConditions(filters);
  };

  const handleApplyConstraint = () => {
    // Apply the shift constraint logic based on the conditions and temporal locations
    // For example:
    const constraint: Constraint = {
      name: constraintName,
      when: whenConditions,
      on: anyDay,
      then: thenConditions,
      daysAfter: relativeDay,
    }
    console.log('New shift constraint', constraint);
    onConstraintReady(constraint);
  };

  const handleAnyDayChange = (event: SelectChangeEvent<string>) => {
    setAnyDay(event.target.value);
  };

  const handleRelativeDayChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value.replace(/\D/g, ''); // Remove non-numeric characters
    setRelativeDay(value);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setConstraintName(value);
  };

  return (
    <div>
      <div>
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>Name</InputLabel>
          <TextField
            type="text"
            value={constraintName}
            onChange={handleNameChange}
            fullWidth
          />
        </FormControl>
      </div>
      <h4>WHEN</h4>
      <QueryFilter data={data} onFiltersReady={handleWhenFiltersReady} />
      <div>
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>On Any Day</InputLabel>
          <Select value={anyDay} onChange={handleAnyDayChange}>
            {getAnyDayOptions().map((day) => (
              <MenuItem key={day} value={day}>
                {day}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
      <h4>THEN</h4>
      <QueryFilter data={data} onFiltersReady={handleThenFiltersReady} />
      <div>
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>Days After</InputLabel>
          <TextField
            type="number"
            value={relativeDay}
            onChange={handleRelativeDayChange}
            InputProps={{
              inputProps: { min: 0 },
            }}
            fullWidth
          />
        </FormControl>
      </div>
      <Button onClick={handleApplyConstraint}>Apply Constraint</Button>
    </div>
  );
}

export default ConstraintBuilder;
