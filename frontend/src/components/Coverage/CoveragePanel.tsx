import React, { Component, useState } from 'react';
import CoverageEditableView from './CoverageEditableView';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { CoverageT, ShiftT } from './types';

type CoveragePanelProps = {
    shifts: ShiftT[];
};

const CoveragePanel: React.FC<CoveragePanelProps> = ({shifts}) => {
    const [coverages, setCoverages] = useState<CoverageT[]>([]);
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
            id: `id-${Date.now()}`, // Temporary unique ID, replace with real ID from the backend if needed
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
