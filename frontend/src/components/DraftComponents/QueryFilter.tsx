import React, { useEffect, useState } from 'react';
import { Select, MenuItem, FormControl, InputLabel, IconButton, Button, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

function Filter({ filter, onRemoveFilter }) {
  return (
    <div>
      <FormControl sx={{ m: 1, minWidth: 120 }}>
        <InputLabel>Select Column</InputLabel>
        <Select value={filter.column} disabled>
          <MenuItem value={filter.column}>{filter.column}</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1, minWidth: 120 }}>
        <InputLabel>Select Operator</InputLabel>
        <Select value={filter.operator} disabled>
          <MenuItem value={filter.operator}>{filter.operator}</MenuItem>
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1, minWidth: 120 }}>
        <InputLabel>Select Value</InputLabel>
        <Select value={filter.value} disabled>
          <MenuItem value={filter.value}>{filter.value}</MenuItem>
        </Select>
      </FormControl>
      <IconButton onClick={onRemoveFilter}>
        <DeleteIcon />
      </IconButton>
    </div>
  );
}

function NewFilter({ data, onAddFilter }) {
  const [selectedColumn, setSelectedColumn] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedValue, setSelectedValue] = useState('');

  const columnOperators = {
    text: ['equal', 'not equal'],
    select: ['equal', 'not equal'],
    number: ['equal', 'not equal', 'less than', 'greater than'],
  };

  const handleColumnChange = (event) => {
    setSelectedColumn(event.target.value);
    setSelectedOperator('');
    setSelectedValue('');
  };

  const getColumnOptions = () => {
    return data.columns.map((column) => (
      <MenuItem key={column.name} value={column.name}>
        {column.name}
      </MenuItem>
    ));
  };

  const handleOperatorChange = (event) => {
    setSelectedOperator(event.target.value);
  };

  const getOperatorOptions = () => {
    const columnType = data.columns.find((column) => column.name === selectedColumn)?.type;
    if (columnType) {
      return columnOperators[columnType].map((operator) => (
        <MenuItem key={operator} value={operator}>
          {operator}
        </MenuItem>
      ));
    }
    return null;
  };

  const handleValueChange = (event) => {
    setSelectedValue(event.target.value);
  };

  const handleAddFilter = () => {
    if (selectedColumn && selectedOperator && selectedValue) {
      const newFilter = {
        column: selectedColumn,
        operator: selectedOperator,
        value: selectedValue,
      };
      onAddFilter(newFilter);
      setSelectedColumn('');
      setSelectedOperator('');
      setSelectedValue('');
    }
  };

  const isFilterReady = () => {
    return selectedColumn && selectedOperator && selectedValue;
  };

  const getValueOptions = () => {
    const columnType = data.columns.find((column) => column.name === selectedColumn)?.type;
    if (columnType === 'select') {
      const uniqueValues = [...new Set(data.rows.map((row) => row[selectedColumn]))];
      return uniqueValues.map((value) => (
        <MenuItem key={value} value={value}>
          {value}
        </MenuItem>
      ));
    }
    return null;
  };

  const getValueInput = () => {
    const columnType = data.columns.find((column) => column.name === selectedColumn)?.type;
    if (columnType === 'text') {
      return (
        <TextField
          value={selectedValue}
          onChange={handleValueChange}
          label="Select Value"
          fullWidth
        />
      );
    } else if (columnType === 'number') {
      return (
        <TextField
          value={selectedValue}
          onChange={handleValueChange}
          label="Select Value"
          type="number"
          fullWidth
        />
      );
    } else {
      return (
        <Select value={selectedValue} onChange={handleValueChange}>
          {getValueOptions()}
        </Select>
      );
    }
  };

  return (
    <div>
      <FormControl sx={{ m: 1, minWidth: 120 }}>
        <InputLabel>Select Column</InputLabel>
        <Select value={selectedColumn} onChange={handleColumnChange}>
          {getColumnOptions()}
        </Select>
      </FormControl>
      {selectedColumn && (
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>Select Operator</InputLabel>
          <Select value={selectedOperator} onChange={handleOperatorChange}>
            {getOperatorOptions()}
          </Select>
        </FormControl>
      )}
      {selectedOperator && (
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <InputLabel>Select Value</InputLabel>
          {getValueInput()}
        </FormControl>
      )}
      <IconButton onClick={handleAddFilter} disabled={!isFilterReady()}>
        <AddIcon />
      </IconButton>
    </div>
  );
}

function QueryFilter({ data, onFiltersReady }) {
  const [filters, setFilters] = useState([]);

  const handleAddFilter = (newFilter) => {
    setFilters((prevFilters) => [...prevFilters, newFilter]);
  };

  const handleRemoveFilter = (index) => {
    setFilters((prevFilters) => prevFilters.filter((_, i) => i !== index));
  };

  // Call callback as soon as list updates
  useEffect(() => {
    onFiltersReady(filters);
  }, [filters])

  return (
    <div>
      {filters.map((filter, index) => (
        <Filter key={index} filter={filter} onRemoveFilter={() => handleRemoveFilter(index)} />
      ))}
      <NewFilter data={data} onAddFilter={handleAddFilter} />
    </div>
  );
}

export default QueryFilter;
