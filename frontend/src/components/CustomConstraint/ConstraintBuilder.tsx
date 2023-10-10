import React, { ChangeEvent, useState } from 'react';
import QueryFilter from './QueryFilter';
import { FormControl, InputLabel, Select, MenuItem, TextField, Button, SelectChangeEvent } from '@mui/material';

type OtherDayOptionType = 'dayName' | 'dayNumber';

interface SelectDayOption {
  value: DayIdT;
  label: string;
}


function otherDayOptionType(firstDay: DayIdT) {
  if (firstDay == 'any') {
    return 'dayNumber';
  }
  return 'dayName';
}

function getDayOptions() {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
}

function getFirstDayOptions() {
  return [
    {
      value: 'any',
      label: 'Any day',
    },
    {
      value: 'mon',
      label: 'Monday',
    },
    {
      value: 'tue',
      label: 'Tuesday',
    },
    {
      value: 'wed',
      label: 'Wednesday',
    },
    {
      value: 'thu',
      label: 'Thursday',
    },
    {
      value: 'fri',
      label: 'Friday',
    },
    {
      value: 'sat',
      label: 'Saturday',
    },
    {
      value: 'sun',
      label: 'Sunday',
    },
  ];
}

type ConstraintBuilderProps = {
  data: Config;
  onConstraintReady: (constraint: any) => void;
};

const ConstraintBuilder: React.FC<ConstraintBuilderProps> = ({ data, onConstraintReady }) => {
  const [constraintName, setConstraintName] = useState<string>('');
  const [whenDayFilters, setWhenDayFilters] = useState<DayFilter[]>([]);
  const [thenDayFilters, setThenDayFilters] = useState<DayFilter[]>([]);

  const handleDayFiltersReady = (type: 'when' | 'then', index: number, filters: QueryFilter[]) => {
    if (type === 'when') {
      const updatedWhen = [...whenDayFilters];
      updatedWhen[index].filters = filters;
      setWhenDayFilters(updatedWhen);
    } else {
      const updatedThen = [...thenDayFilters];
      updatedThen[index].filters = filters;
      setThenDayFilters(updatedThen);
    }
  };
  
  const addNewDayFilter = (type: 'when' | 'then') => {
    const newDayFilter: DayFilter = { day: 'any', filters: [] };
    if (type === 'when') {
      setWhenDayFilters([...whenDayFilters, newDayFilter]);
    } else {
      setThenDayFilters([...thenDayFilters, newDayFilter]);
    }
  };
  
  const removeDayFilter = (type: 'when' | 'then', index: number) => {
    if (type === 'when') {
      const updatedWhen = whenDayFilters.filter((_, i) => i !== index);
      setWhenDayFilters(updatedWhen);
    } else {
      const updatedThen = thenDayFilters.filter((_, i) => i !== index);
      setThenDayFilters(updatedThen);
    }
  };

  const updateDay = (type: 'when' | 'then', index: number, day: number | DayIdT) => {
    if (type === 'when') {
      const updatedWhen = [...whenDayFilters];
      updatedWhen[index].day = day;
      setWhenDayFilters(updatedWhen);
    } else {
      const updatedThen = [...thenDayFilters];
      updatedThen[index].day = day;
      setThenDayFilters(updatedThen);
    }
  };

  const handleApplyConstraint = () => {
    const constraint: Constraint = {
      name: constraintName,
      when: whenDayFilters,
      then: thenDayFilters,
    };
    console.log('New shift constraint', constraint);
    onConstraintReady(constraint);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    setConstraintName(value);
  };

  return (
    <div>
      <div>
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <TextField
            label="Name"
            type="text"
            value={constraintName}
            onChange={handleNameChange}
            fullWidth
          />
        </FormControl>
      </div>
      
      <h4>WHEN</h4>
      {whenDayFilters.map((dayFilter, index) => (
        <div key={index}>
          {/* Day selection dropdown */}
          <FormControl sx={{ m: 1, minWidth: 120 }}>
            {index == 0 ? (
              <Select label="Day" value={dayFilter.day} onChange={(e) => updateDay('when', index, e.target.value as number | DayIdT)}>
                {getFirstDayOptions().map((daySelectOpt, idx) => (
                  <MenuItem key={idx} value={daySelectOpt.value}>{daySelectOpt.label}</MenuItem>
                ))}
              </Select>)
              :
              otherDayOptionType(whenDayFilters[0].day as DayIdT) == 'dayNumber' ? (
                  <TextField
                  label="Day"
                  type="number"
                  value={dayFilter.day}
                  onChange={(e) => updateDay('when', index, e.target.value as number)}
                  fullWidth
                  />
              ) : (
                <Select label="Day" value={dayFilter.day} onChange={(e) => updateDay('when', index, e.target.value as number | DayIdT)}>
                  {getFirstDayOptions().map((daySelectOpt, idx) => (
                    <MenuItem key={idx} value={daySelectOpt.value}>{daySelectOpt.label}</MenuItem>
                  ))}
                </Select>
              )
            }
          </FormControl>
          <QueryFilter data={data} onFiltersReady={(filters) => handleDayFiltersReady('when', index, filters)} />
          {/* Button to remove the day and its filters */}
          <Button onClick={() => removeDayFilter('when', index)}>Remove Day Filter</Button>
        </div>
      ))}
      <Button onClick={() => addNewDayFilter('when')}>Add Day Filter for WHEN</Button>

      <h4>THEN</h4>
      {thenDayFilters.map((dayFilter, index) => (
        <div key={index}>
          {/* Day selection dropdown */}
          <FormControl sx={{ m: 1, minWidth: 120 }}>
          {otherDayOptionType(whenDayFilters[0].day as DayIdT) == 'dayNumber' ? (
              <TextField
              label="Day"
              type="number"
              value={dayFilter.day}
              onChange={(e) => updateDay('then', index, e.target.value as number)}
              fullWidth
              />
          ) : (
            <Select label="Day" value={dayFilter.day} onChange={(e) => updateDay('then', index, e.target.value as number | DayIdT)}>
              {getFirstDayOptions().map((daySelectOpt, idx) => (
                <MenuItem key={idx} value={daySelectOpt.value}>{daySelectOpt.label}</MenuItem>
              ))}
            </Select>
          )}

          </FormControl>
          <QueryFilter data={data} onFiltersReady={(filters) => handleDayFiltersReady('then', index, filters)} />
          {/* Button to remove the day and its filters */}
          <Button onClick={() => removeDayFilter('then', index)}>Remove Day Filter</Button>
        </div>
      ))}
      <Button onClick={() => addNewDayFilter('then')}>Add Day Filter for THEN</Button>
      <div>
        <Button onClick={handleApplyConstraint}>Apply Constraint</Button>
      </div>
    </div>
  );
}

export default ConstraintBuilder;
