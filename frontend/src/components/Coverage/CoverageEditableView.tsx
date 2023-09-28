import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';


import { useEffect, useState } from "react";
import { CoverageT, ShiftDemandT, ShiftT } from './types';


type CoverageEditableViewProps = {
    coverage: CoverageT;
    shifts: ShiftT[];
    onChange: (updatedCoverage: CoverageT) => void;
};

const CoverageEditableView: React.FC<CoverageEditableViewProps> = ({ coverage, shifts, onChange }) => {
    // Local state to manage temporary changes before saving
    const [localCoverage, setLocalCoverage] = useState<CoverageT>(coverage);

    // Effect to update local state when the coverage prop changes
    useEffect(() => {
        setLocalCoverage(coverage);
    }, [coverage]);

    // handlers
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = event.target;
        if (type === "date") {
            setLocalCoverage(prev => ({ ...prev, [name]: new Date(value) }));
        } else {
            setLocalCoverage(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddShiftDemand = (dayIndex: number, shiftId: string) => {
        setLocalCoverage(prev => {
            const existingShiftDemand = prev.shiftDemands.find(sd => sd.dayIndex === dayIndex && sd.shiftId === shiftId);
            if (existingShiftDemand) {
                // Increment quantity if shift demand already exists
                return {
                    ...prev,
                    shiftDemands: prev.shiftDemands.map(sd => 
                        sd.dayIndex === dayIndex && sd.shiftId === shiftId ? 
                        { ...sd, quantity: sd.quantity + 1 } : 
                        sd
                    )
                };
            } else {
                // Add new shift demand if it doesn't exist
                const newShiftDemand: ShiftDemandT = {
                    dayIndex,
                    shiftId,
                    quantity: 1
                };
                return {
                    ...prev,
                    shiftDemands: [...prev.shiftDemands, newShiftDemand]
                };
            }
        });
    };
    
    const handleRemoveShiftDemand = (dayIndex: number, shiftId: string) => {
        setLocalCoverage(prev => {
            const existingShiftDemand = prev.shiftDemands.find(sd => sd.dayIndex === dayIndex && sd.shiftId === shiftId);
            if (existingShiftDemand && existingShiftDemand.quantity > 1) {
                // Decrement quantity if it's more than 1
                return {
                    ...prev,
                    shiftDemands: prev.shiftDemands.map(sd => 
                        sd.dayIndex === dayIndex && sd.shiftId === shiftId ? 
                        { ...sd, quantity: sd.quantity - 1 } : 
                        sd
                    )
                };
            } else {
                // Remove the shift demand entirely if quantity is 1 or doesn't exist
                return {
                    ...prev,
                    shiftDemands: prev.shiftDemands.filter(sd => !(sd.dayIndex === dayIndex && sd.shiftId === shiftId))
                };
            }
        });
    };    

    const handleSaveChanges = () => {
        onChange(localCoverage);
    };

    return (
        <div>
            <label>
                Name:
                <input 
                    type="text" 
                    name="name" 
                    value={localCoverage.name} 
                    onChange={handleInputChange} 
                />
            </label>

            <label>
                Start Date:
                <input 
                    type="date" 
                    name="dateStart" 
                    value={localCoverage.dateStart.toISOString().split('T')[0]} 
                    onChange={handleInputChange} 
                />
            </label>

            <label>
                End Date:
                <input 
                    type="date" 
                    name="dateEnd" 
                    value={localCoverage.dateEnd.toISOString().split('T')[0]} 
                    onChange={handleInputChange} 
                />
            </label>
    
            <h3>Shift Demands:</h3>
            <div style={{ display: 'flex' }}>
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <div key={dayIndex} style={{ flex: 1, margin: '0 10px', border: '1px solid #ccc' }}>
                        <h4>Day {dayIndex}</h4>
                        
                        {/* List of shifts for this day */}
                        {localCoverage.shiftDemands
                            .filter(demand => demand.dayIndex === dayIndex)
                            .map(demand => (
                                <Box key={demand.shiftId} display="flex" alignItems="center" marginBottom={1}>
                                    <Box flexGrow={1}>
                                        {shifts.find(s => s.id === demand.shiftId)?.name}
                                    </Box>
                                    <Chip label={demand.quantity} size="small" variant="outlined" style={{ marginRight: '8px' }} />
                                    <IconButton onClick={() => handleRemoveShiftDemand(dayIndex, demand.shiftId)} size="small">
                                        <IndeterminateCheckBoxIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))
                        }
                        
                        {/* Dropdown to add a new shift to this day */}
                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '10px' }}>+</span>
                            <select 
                                defaultValue="" 
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleAddShiftDemand(dayIndex, e.target.value);
                                        e.target.value = '';  // Reset the dropdown value after handling the addition
                                    }
                                }}
                            >
                                <option value="" disabled>Select a shift</option>
                                {shifts.map(shift => (
                                    <option key={shift.id} value={shift.id}>{shift.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
    
            <Button onClick={handleSaveChanges}>Save Changes</Button>
        </div>
    );  
};

export default CoverageEditableView;
