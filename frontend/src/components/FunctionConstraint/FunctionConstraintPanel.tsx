import { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, FormControl, Grid, IconButton, InputLabel, List, ListItem, ListItemText, MenuItem, Paper, Select, SelectChangeEvent, TextField, Typography } from "@mui/material";
import { useConstraintStore } from "../../stores/constraintStore";
import { ShiftDimensionT, ShiftT } from "../Shift/types";
import { BuildBlockNameT } from "../Constraint/types";
import FileCopyIcon from '@mui/icons-material/FileCopy';

type FunctionDefinitionT = {
  name: string;
  label: string;
  args: ArgDefinition[];
  description: string;
  examples: {formula: string, explanation: string}[];
}

type OptionT = {
  value: string;
  label: string;
  possibleTypes?: string[];  // TODO: needs typing later on
}

type ArgDefinition = {
  name: string;
  label: string;
  type: 'select' | 'number' | 'text' | 'selectShifts';
  options?: OptionT[];
  placeholder?: string;
}

// this can come from the API later on
const functions: FunctionDefinitionT[] = [
  {
    name: 'sequence',
    label: 'CONSECUTIVE',
    description: 'This function is for a constraint about consecutive shifts.',
    examples: [
      {
        formula: `CONSECUTIVE('Off';'week';2;'at most')`,
        explanation: `This constraint will ensure that the shift named 'Off' will be scheduled at most 2 consecutive days in a week.`
      },
      {
        formula: `CONSECUTIVE(SELECT_SHIFTS('Group';'equal';'Off');'week';2;'at most')`,
        explanation: `This constraint will ensure that any combination of shifts with group 'Off' will be scheduled at most 2 consecutive days in a week.`
      },
    ],
    args: [
      {
        name: 'shift_id',
        label: 'Shift',
        type: 'selectShifts',
      },
      {
        name: 'day',
        label: 'Time Period',
        type: 'select',
        options: [
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ],
      },
      {
        name: 'quantity',
        label: 'Quantity',
        type: 'number',
        placeholder: 'Enter a number',
      },
      {
        name: 'operator',
        label: 'Comparator',
        type: 'select',
        options: [
          { value: 'at most', label: 'At most' },
          { value: 'exactly', label: 'Exactly' },
          { value: 'at least', label: 'At least' },
        ],
      },
    ],
  },
  {
    name: 'sum',
    label: 'SUM',
    description: 'This function is for a constraint about the sum of shifts.',
    examples: [
      {
        formula: `SUM('Shift name';'week';2;'at most')`,
        explanation: `This constraint will ensure that the shift named 'Shift name' will be scheduled at most 2 days in a week.`
      },
    ],
    args: [
      {
        name: 'shift_id',
        label: 'Shift',
        type: 'selectShifts',
      },
      {
        name: 'day',
        label: 'Time Period',
        type: 'select',
        options: [
          { value: 'day', label: 'Day' },
          { value: 'week', label: 'Week' },
        ],
      },
      {
        name: 'quantity',
        label: 'Quantity',
        type: 'number',
        placeholder: 'Enter a number',
      },
      {
        name: 'operator',
        label: 'Comparator',
        type: 'select',
        options: [
          { value: 'at most', label: 'At most' },
          { value: 'exactly', label: 'Exactly' },
          { value: 'at least', label: 'At least' },
        ],
      },
    ],
  },
  {
    // a possible evolution of this is to just have a WHEN function and a THEN function
    // to return shift_id,day 
    name: 'order',
    label: 'WHEN_THEN',
    description: 'This function is for a constraint about the order of shifts.',
    examples: [
      {
        formula: `WHEN_THEN('Shift name';'yes';'Shift name 2';2)`,
        explanation: `This constraint will ensure that the shift named 'Shift name' will be scheduled before the shift named 'Shift name 2' by 2 days.`
      },
    ],
    args: [
      {
        // should be shift_id, also should support multiple shift selection
        name: 'shift_id_reference', 
        label: 'Shift',
        type: 'selectShifts',
      },
      {
        name: 'operator',
        label: 'Comparator',
        type: 'select',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        name: 'shift_id_relative', 
        label: 'Other Shift',
        type: 'selectShifts',
      },
      {
        name: 'quantity',
        label: 'Days Apart',
        type: 'number',
        placeholder: 'Enter a number',
      },
    ],
  },
  {
    name: 'SELECT_SHIFTS',
    label: 'SELECT_SHIFTS',
    description: 'This function helps selecting shifts based on a condition.',
    examples: [
      {
        formula: `SELECT_SHIFTS('name';'equal';'Shift name')`,
        explanation: `This function will return the shift ids of all shifts with name 'Shift name'.`
      },
    ],
    args: [
      {
        name: 'dimension',
        label: 'Dimension',
        type: 'select',
        options: [
          { value: 'name', label: 'Name' },
          // You can add other dimensions here as needed
        ],
      },
      {
        name: 'comparator',
        label: 'Comparator',
        type: 'select',
        options: [
          { value: 'equal', label: 'Equal' },
          { value: 'not equal', label: 'Not Equal' },
          // Add more comparators if necessary
        ],
      },
      {
        name: 'value',
        label: 'Value',
        type: 'text',
        placeholder: 'Enter value',
      }
    ],
  },
];

interface SelectShiftProps {
  shifts: ShiftT[];
  shiftDimensions: ShiftDimensionT[];
  onChange: (selectedShiftIds: string[]) => void;
}

const SelectShift: React.FC<SelectShiftProps> = ({ shifts, shiftDimensions, onChange }) => {
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [comparator, setComparator] = useState<string | null>(null);
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDimension && comparator && value !== null) {
      const matchingShifts = shifts.filter(shift => {
        const property = shift.shiftProperties.find(p => p.shiftDimensionId === selectedDimension);
        if (!property) return false;
        switch (comparator) {
          case 'equal':
            return property.value === value;
          case 'not equal':
            return property.value !== value;
          default:
            return false;
        }
      });
      onChange(matchingShifts.map(shift => shift.id));
    }
  }, [selectedDimension, comparator, value, shifts, onChange]);

  const handleDimensionChange = (event: SelectChangeEvent<string>) => {
    setSelectedDimension(event.target.value as string);
    setComparator(null);
    setValue(null);
  };

  const handleComparatorChange = (event: SelectChangeEvent<string>) => {
    setComparator(event.target.value as string);
    setValue(null);
  };

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value as string);
  };

  return (
    <Paper elevation={3} style={{ padding: '16px', margin: '8px 0' }}>
      <Typography variant="h6" gutterBottom>
        Select Shift
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel>Dimension</InputLabel>
        <Select value={selectedDimension || ''} onChange={handleDimensionChange}>
          {shiftDimensions.map(dimension => (
            <MenuItem key={dimension.id} value={dimension.id}>
              {dimension.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {selectedDimension && (
        <FormControl fullWidth>
          <InputLabel>Comparator</InputLabel>
          <Select value={comparator || ''} onChange={handleComparatorChange}>
            <MenuItem value="equal">Equal</MenuItem>
            <MenuItem value="not equal">Not Equal</MenuItem>
          </Select>
        </FormControl>
      )}
      {comparator && (
        <FormControl fullWidth>
        <InputLabel>Value</InputLabel>
        <TextField
          value={value || ''}
          onChange={handleValueChange}
          placeholder="Enter value"
        />
      </FormControl>
      )}
   </Box>
    </Paper>
  );
};


interface BlockOutT {
  name: BuildBlockNameT;
  value: string | number | string[];
}

interface FormulaInputProps {
  onSubmit: (value: string) => void;
}

const FormulaInput: React.FC<FormulaInputProps> = ({ onSubmit }) => {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    onSubmit(inputValue);
  };

  return (
    <Box display="flex" flexDirection="row" alignItems="center" width="100%">
      <TextField 
        fullWidth
        variant="outlined"
        label="Enter formula"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <Box ml={2}>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          Submit
        </Button>
      </Box>
    </Box>
  );
};

interface ParsedNode {
  value: string;
  args: ParsedNode[];
}

const parseInput = (inputValue: string) => {
  let idx = 0;

  const parseNode = (): ParsedNode => {
      let name = '';
      const args = [];

      // Check for string values by their enclosing quotes
      const isStringArg = inputValue[idx] === "'";
      if (isStringArg) {
          idx++; // skip the opening quote
      }

      // Extract the name/function or argument value
      while (idx < inputValue.length && inputValue[idx] !== '(' && inputValue[idx] !== ')' && inputValue[idx] !== ';' && (!isStringArg || inputValue[idx] !== "'")) {
          name += inputValue[idx];
          idx++;
      }

      if (isStringArg && inputValue[idx] === "'") {
          idx++; // skip the closing quote
      }

      // If the next character is an opening parenthesis, we are dealing with a function, so we parse its arguments
      if (inputValue[idx] === '(') {
          idx++; // skip opening parenthesis

          // Parse arguments of the function until we hit the closing parenthesis
          while (idx < inputValue.length && inputValue[idx] !== ')') {
              args.push(parseNode());

              if (inputValue[idx] === ';') {
                  idx++; // skip semicolon
              }
          }

          if (inputValue[idx] === ')') {
              idx++; // skip closing parenthesis
          }
      }

      return { value: name.trim(), args };
  };

  return parseNode();
};


type ComparatorT = 'equal' | 'not equal';

const SELECT_SHIFTS = (
  dimensionName: string, 
  comparator: ComparatorT, 
  value: string, 
  shifts: ShiftT[], 
  shiftDimensions: ShiftDimensionT[]
): string[] => {
  
  const checkComparator = (propertyValue: string | number | boolean, targetValue: string): boolean => {
    switch (comparator) {
      case 'equal':
        return propertyValue === targetValue;
      case 'not equal':
        return propertyValue !== targetValue;
      default:
        return false;
    }
  };

  let matchedShifts: ShiftT[] = [];

  if (dimensionName === 'name') {
    matchedShifts = shifts.filter(shift => checkComparator(shift.name, value));
  } else {
    // Find the corresponding dimension ID based on its name
    const dimension = shiftDimensions.find(d => d.name === dimensionName);
    if (!dimension) return [];  // If no matching dimension is found, return early
    matchedShifts = shifts.filter(shift => {
      const property = shift.shiftProperties.find(p => p.shiftDimensionId === dimension.id);
      if (!property) return false;
      return checkComparator(property.value, value);
    });
  }
  
  return matchedShifts.map(shift => shift.id);
};

const resolveFunctions = (parsedFunction: ParsedNode, shifts: ShiftT[], shiftDimensions: ShiftDimensionT[]): any => {
  const funcDef = functions.find(f => f.label === parsedFunction.value);
  if (!funcDef) {
    throw new Error(`Function not found: ${parsedFunction.value}`);
  }

  const resolvedArgs = parsedFunction.args.map((arg: ParsedNode, index) => {
    // This is a nested function
    if (typeof arg === 'object' && arg.args.length > 0) {
      return resolveFunctions(arg, shifts, shiftDimensions);
    }

    // If the argument type is selectShifts but there are no arguments, we assume it's a shift name
    if (funcDef.args[index].type === 'selectShifts' && arg.args.length == 0) {
      return SELECT_SHIFTS('name', 'equal', arg.value, shifts, shiftDimensions);
    }

    return arg.value;
  });

  // Here we have a special case where we want to run the function to resolve the shift id
  // We might need to split such functions from root constraint functions
  if (parsedFunction.value === 'SELECT_SHIFTS') {
    const [dimension, comparator, value] = resolvedArgs;
    return SELECT_SHIFTS(dimension, comparator, value, shifts, shiftDimensions);
  }

  return resolvedArgs;
};



const validateFunction = (parsedInput: { value: string, args: any[] } , functionDefinition: FunctionDefinitionT) => {
  if (parsedInput.value !== functionDefinition.label) {
    throw new Error(`Function name mismatch: ${parsedInput.value} !== ${functionDefinition.name}`);
  }
  if (parsedInput.args.length !== functionDefinition.args.length) {
    throw new Error(`Function ${functionDefinition.name}: Argument count mismatch: ${parsedInput.args.length} !== ${functionDefinition.args.length}`);
  }

  for (let i = 0; i < parsedInput.args.length; i++) {
    const argDef = functionDefinition.args[i];
    const argValue = parsedInput.args[i].value;

    switch (argDef.type) {
      case 'select':
        if (!argDef.options!.some(option => option.value === argValue)) {
          console.log('Available options:', argDef.options);
          throw new Error(`Unknown option for argument ${argDef.name}: ${argValue}`);
        };
        break;
      case 'number':
        if (isNaN(Number(argValue))) {
          throw new Error(`Invalid number for argument ${argDef.name}`);
        
        };
        break;
      // ... handle other types as necessary
    }
  }
  return true;
};

type CopyToClipboardButtonProps = {
  textToCopy: string;
};

const CopyToClipboardButton: React.FC<CopyToClipboardButtonProps> = ({textToCopy}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Success feedback
        console.log('Text copied to clipboard');
      })
      .catch(err => {
        // Error handling
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <IconButton onClick={copyToClipboard} aria-label="copy">
      <FileCopyIcon />
    </IconButton>
  );
}

type FunctionDocumentationProps = {
  functions: FunctionDefinitionT[];
};

const FunctionDocumentation: React.FC<FunctionDocumentationProps> = ({ functions }) => {
  const [selectedFunctionName, setSelectedFunctionName] = useState(functions[0]?.name || '');

  const selectedFunction = functions.find(func => func.name === selectedFunctionName);

  return (
    <Box mt={3}>
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h4" component="div">
              <Select
                value={selectedFunctionName}
                onChange={(e) => setSelectedFunctionName(e.target.value as string)}
                variant="standard"
                style={{ marginLeft: '8px' }}
              >
                {functions.map(func => (
                  <MenuItem key={func.name} value={func.name}>{func.label}</MenuItem>
                ))}
              </Select>
            </Typography>
          </Box>

          {selectedFunction && (
            <>
              <Typography variant="body1" mt={2}>{selectedFunction.description}</Typography>

              <Typography variant="h6" style={{ marginTop: '12px' }}>Examples:</Typography>
              {selectedFunction.examples.map((example, index) => (
                <Box key={index} mt={2}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Box component="pre" bgcolor="#f5f5f5" p={1} borderRadius={1}>
                        {example.formula}
                      </Box>
                    </Grid>
                    <Grid item>
                      <CopyToClipboardButton textToCopy={example.formula} />
                    </Grid>
                  </Grid>
                  <Typography variant="body2" style={{ marginTop: '8px' }}>
                    <strong>Explanation:</strong> {example.explanation}
                  </Typography>
                </Box>
              ))}

              <Typography variant="h6" style={{ marginTop: '12px' }}>Arguments:</Typography>
              <List dense>
                {selectedFunction.args.map(arg => (
                  <ListItem key={arg.name}>
                    <ListItemText 
                      primary={`${arg.label} (${arg.type})${arg.type === 'select' ? `: ${arg.options!.map(opt => opt.label).join(', ')}` : ''}`} 
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};


interface SentenceBuilderProps {
  shifts: ShiftT[];
  shiftDimensions: ShiftDimensionT[];
  onSubmit: (blocks: BlockOutT[]) => void;
}

const SentenceBuilder: React.FC<SentenceBuilderProps> = ({ shifts, shiftDimensions, onSubmit }) => {
  const [showDocs, setShowDocs] = useState(false);
  
  const handleSubmit = (inputValue: string) => {
    const parsedInput = parseInput(inputValue);
    if (!parsedInput) {
      console.error("Invalid input format.");
      return;
    }

    const functionDefinition = functions.find(f => f.label === parsedInput.value);
    if (!functionDefinition) {
      console.error(`Function not found: ${parsedInput.value}`);
      return;
    }

    const isValid = validateFunction(parsedInput, functionDefinition);
    if (!isValid) {
      console.error("Invalid function or arguments.");
      return;
    }

    console.log('parsedInput', parsedInput);

    const resolvedArgs = resolveFunctions(parsedInput, shifts, shiftDimensions);
    if (!resolvedArgs) {
      console.error("Error resolving function arguments.");
      return;
    }

    console.log('resolvedArgs', resolvedArgs);

    const blockOuts: BlockOutT[] = functionDefinition.args.map((arg, index) => ({
      name: arg.name as BuildBlockNameT,
      value: resolvedArgs[index]
    }));

    blockOuts.push({
      name: 'type',
      value: functionDefinition.name,
    });

    console.log('blockOuts before applying shift id selection', blockOuts);
    onSubmit(blockOuts);
  };

  return (
    <div>
      <Box mb={2}>
        <FormulaInput onSubmit={handleSubmit} />
      </Box>

      <Button color="secondary" onClick={() => setShowDocs(!showDocs)}>
        {showDocs ? 'Hide Documentation' : 'Show Documentation'}
      </Button>
      {showDocs && <FunctionDocumentation functions={functions} />}
    </div>
  );
};


interface ConstraintBuilderProps {
  shifts: ShiftT[];
  shiftDimensions: ShiftDimensionT[];
  onSubmit: (blocks: BlockOutT[]) => void;
}

const ConstraintBuilder: React.FC<ConstraintBuilderProps> = ({ shifts, shiftDimensions, onSubmit }) => {
  const [selectedFunction, setSelectedFunction] = useState<FunctionDefinitionT | null>(null);
  const [args, setArgs] = useState<{ [key: string]: string | number | string[] }>({});
  const [isComplete, setIsComplete] = useState<boolean>(false);

  useEffect(() => {
    if (selectedFunction) {
      setIsComplete(selectedFunction.args.every(arg => args[arg.name] !== undefined));
    }
  }, [selectedFunction, args]);

  const handleFunctionSelection = (funcName: string) => {
    const func = functions.find(f => f.name === funcName);
    if (func) {
      setSelectedFunction(func);
      setArgs({}); // Reset arguments
    }
  };

  const handleArgChange = (argName: string, value: string | number | string[]) => {
    if (value instanceof Array) {
      console.log('value is array, taking only first element', value);
      value = value[0];
    }

    setArgs(prevArgs => ({
      ...prevArgs,
      [argName]: value
    }));

    // Check if all arguments have values
    if (selectedFunction) {
      setIsComplete(selectedFunction.args.every(arg => args[arg.name] !== undefined));
    }
  };

  const handleOnSubmit = () => {
    if (selectedFunction) {
      const blockOuts: BlockOutT[] = selectedFunction.args.map(arg => ({
        name: arg.name as BuildBlockNameT,
        value: args[arg.name] as string | number
      }));
  
      blockOuts.push({
        name: 'type',
        value: selectedFunction.name,
      });
  
      onSubmit(blockOuts);
    }
  };
  
  const renderArgComponent = (arg: ArgDefinition, argValue: string | number | string[]) => {
    switch (arg.type) {
      case 'selectShifts':
        return (
          <>
            <SelectShift
              shifts={shifts}
              shiftDimensions={shiftDimensions}
              onChange={(shiftIds: string[]) => handleArgChange(arg.name, shiftIds)}
            />
          </>
        );
      case 'select':
        return (
          <>
            <InputLabel id={`${arg.name}-label`}>{arg.label}</InputLabel>
            <Select
              labelId={`${arg.name}-label`}
              value={argValue}
              onChange={(e) => handleArgChange(arg.name, e.target.value)}
            >
              {arg.options?.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </>
        );
      case 'number':
      case 'text':
        return (
          <TextField
            type={arg.type}
            placeholder={arg.placeholder}
            label={arg.label}
            value={argValue}
            onChange={(e) => handleArgChange(arg.name, e.target.value)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2
      }}
    >
      <FormControl fullWidth>
        <InputLabel id="function-select-label">Function</InputLabel>
        <Select
          labelId="function-select-label"
          value={selectedFunction?.name || ''}
          onChange={(e) => handleFunctionSelection(e.target.value as string)}
        >
          {functions.map(func => (
            <MenuItem key={func.name} value={func.name}>{func.label}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedFunction && selectedFunction.args.map(arg => (
        <FormControl fullWidth key={arg.name}>
          {renderArgComponent(arg, args[arg.name] || '')}
        </FormControl>
      ))}

      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setSelectedFunction(null);
          setArgs({});
        }}
      >
        Reset
      </Button>

      <Button
        variant="contained"
        color="secondary"
        disabled={!isComplete}
        onClick={handleOnSubmit}
      >
        Submit
      </Button>
    </Box>
  );
};

interface ConstraintPanelProps {
  shifts: ShiftT[];
  shiftDimensions: ShiftDimensionT[];
}

const ConstraintPanel: React.FC<ConstraintPanelProps> = ({ shifts, shiftDimensions }) => {
  const addConstraint = useConstraintStore((state) => state.addConstraint);
  
  const handleSubmit = (blocks: BlockOutT[]) => {
    const constraint = {
      buildBlocks: blocks,
      id: '',
      hard: true,
      priority: 'low',
      active: true,
    };
    addConstraint(constraint);
  }
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: '50px', }}>
      <SentenceBuilder 
        shifts={shifts} 
        shiftDimensions={shiftDimensions}
        onSubmit={handleSubmit}
      />
      {/* <ConstraintBuilder 
        shifts={shifts} 
        shiftDimensions={shiftDimensions}
        onSubmit={handleSubmit} /> */}
    </Box>
  )
};

export default ConstraintPanel;