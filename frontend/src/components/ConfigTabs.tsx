import React, { useEffect, useState } from "react";

import { fetchHospitalProfile } from "../services/api";

import AddOptionChip from "./AddOptionChip";
import NewEntryTextFields from "./NewEntryTextField";
import OptionBlock from "./OptionBlock";

import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

export default function ConfigTabs() {
  const [value, setValue] = React.useState(0);
  const [hospitalProfile, setHospitalProfile] = useState({});
  const [error, setError] = useState("");

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    async function fetchDataAsync() {
      try {
        const jsonData = await fetchHospitalProfile();
        setHospitalProfile(jsonData);
      } catch (error: any) {
        setError(error.message);
      }
    }
    fetchDataAsync();
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Hospital Profile" {...a11yProps(0)} />
          <Tab label="Doctors Profile" {...a11yProps(1)} />
          <Tab label="Parameters" {...a11yProps(2)} />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <OptionBlock />
        {/* <Typography variant="h6" gutterBottom>
          Duty Options
        </Typography>
        <Typography variant="h6" gutterBottom>
          Human Resources
        </Typography> */}
      </TabPanel>
      <TabPanel value={value} index={1}>
        Item Two
      </TabPanel>
      <TabPanel value={value} index={2}>
        Item Three
      </TabPanel>
    </Box>
  );
}
