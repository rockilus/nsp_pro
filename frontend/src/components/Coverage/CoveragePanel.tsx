import React, { Component, useState } from 'react';
import CoverageEditableView from './CoverageEditableView';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';


const shifts: Shift[] = [
    {
        id: "morning",
        name: "Morning Lala",
    },
    {
        id: "afternoon",
        name: "Afternoon Siesta",
    },
    {
        id: "evening",
        name: "Evening zz",
    },
    {
        id: "night",
        name: "Nighty night",
    },
]

const initialCoverage: CoverageT = {
    id: "1",
    name: "Week 1 Coverage",
    dateStart: new Date(), // today's date
    dateEnd: new Date(new Date().setDate(new Date().getDate() + 6)), // 6 days from today
    shiftDemands: [
        {
            dayIndex: 0, // Sunday
            shiftId: "morning",
            quantity: 2
        },
        {
            dayIndex: 1, // Monday
            shiftId: "evening",
            quantity: 3
        },
        {
            dayIndex: 5, // Friday
            shiftId: "night",
            quantity: 1
        }
    ]
};

const initialCoverage2: CoverageT = {
    id: "2",
    name: "XMas Coverage",
    dateStart: new Date(), // today's date
    dateEnd: new Date(new Date().setDate(new Date().getDate() + 6)), // 6 days from today
    shiftDemands: [
        {
            dayIndex: 0, // Sunday
            shiftId: "night",
            quantity: 2
        },
        {
            dayIndex: 1, // Monday
            shiftId: "night",
            quantity: 3
        },
        {
            dayIndex: 5, // Friday
            shiftId: "night",
            quantity: 1
        }
    ]
};

type CoveragePanelProps = {
    // any props that you want to pass from a parent component
};

const CoveragePanel: React.FC<CoveragePanelProps> = () => {
    const [coverages, setCoverages] = useState<CoverageT[]>([initialCoverage, initialCoverage2]);
    const [selectedCoverage, setSelectedCoverage] = useState<CoverageT | undefined>(undefined);
    const [isNewCoverage, setIsNewCoverage] = useState<boolean>(false);

    // handlers
    const handleCoverageChange = (updatedCoverage: CoverageT) => {
        setCoverages(prevCoverages => 
            prevCoverages.map(coverage => 
                coverage.id === updatedCoverage.id ? updatedCoverage : coverage
            )
        );
    };

    const handleSelectCoverage = (coverage: CoverageT) => {
        console.log("Selecting coverage", coverage);
        setSelectedCoverage(coverage);
        setIsNewCoverage(false);
    };

    const handleCreateNewCoverage = () => {
        const newCoverage: CoverageT = {
            id: Date.now(), // Temporary unique ID, replace with real ID from the backend if needed
            name: '',
            dateStart: new Date(),
            dateEnd: new Date(),
            shiftDemands: []
        };
        setSelectedCoverage(newCoverage);
        setIsNewCoverage(true);
    };

    const handleSaveNewCoverage = (newCoverage: CoverageT) => {
        setCoverages(prev => [...prev, newCoverage]);
        setIsNewCoverage(false);
    };
    

return (
    <Box display="flex" flexDirection="column" gap={1}>
        <Typography variant="h4" align="left">
            Coverage Configuration
        </Typography>
        {/* Render a list of coverages */}
        <Box display="flex" flexDirection="row" gap={1}>
            <Select
                value={selectedCoverage?.id || ''}
                onChange={(e) => {
                    const selectedId = e.target.value as string;
                    const selectedCoverage = coverages.find(c => c.id === selectedId);
                    if (selectedCoverage) {
                        handleSelectCoverage(selectedCoverage);
                    }
                }}
                variant="outlined"
                size="small"
            >
                {coverages.map(coverage => (
                    <MenuItem key={coverage.id} value={coverage.id}>
                        {coverage.name}
                    </MenuItem>
                ))}
            </Select>

            {/* Button to add a new coverage */}
            <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon/>}
                onClick={handleCreateNewCoverage}
            >
                Add New Coverage
            </Button>
        </Box>

        {selectedCoverage && (
            <CoverageEditableView
                coverage={selectedCoverage}
                onChange={isNewCoverage ? handleSaveNewCoverage : handleCoverageChange}
                shifts={shifts} />
        )}
    </Box>
    );
}

export default CoveragePanel;
