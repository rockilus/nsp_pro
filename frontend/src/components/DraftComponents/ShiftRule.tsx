import React, { useState } from 'react';
import QueryFilter from './QueryFilter';
import { FormControl, InputLabel, Select, MenuItem, TextField, Button } from '@mui/material';

function getAnyDayOptions() {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return ['Any day', ...daysOfWeek];
}

function ShiftRule({ data, onRuleReady }) {
  const [whenConditions, setWhenConditions] = useState([]);
  const [thenConditions, setThenConditions] = useState([]);
  const [anyDay, setAnyDay] = useState('');
  const [relativeDay, setRelativeDay] = useState('');

  const handleWhenFiltersReady = (filters) => {
    setWhenConditions(filters);
  };

  const handleThenFiltersReady = (filters) => {
    setThenConditions(filters);
  };

  const handleApplyRule = () => {
    // Apply the shift rule logic based on the conditions and temporal locations
    // For example:
    const rule = {
      when: whenConditions,
      on: anyDay,
      then: thenConditions,
      daysAfter: relativeDay,
    }
    console.log('New shift rule', rule);
    onRuleReady(rule);
  };

  const handleAnyDayChange = (event) => {
    setAnyDay(event.target.value);
  };

  const handleRelativeDayChange = (event) => {
    const value = event.target.value.replace(/\D/g, ''); // Remove non-numeric characters
    setRelativeDay(value);
  };

  return (
    <div>
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
      <Button onClick={handleApplyRule}>Apply Rule</Button>
    </div>
  );
}

export default ShiftRule;
