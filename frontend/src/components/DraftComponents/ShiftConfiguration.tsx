import React, { useEffect, useState } from "react";

import Table from "./Table";
import QueryFilter from "./QueryFilter";
import NewShiftRule from "./ShiftRule";

function ShiftConfiguration() {
  const browserLocalStorageKey = "localStorage_shiftConfig";
  const defaultData = {
    rows: [
      { name: "Garde Plo", group: "garde" },
      { name: "Garde Mat", group: "garde" },
      { name: "Off", group: "off" },
      { name: "RTT", group: "off" },
    ],
    columns: [
      { name: "name", type: "text" },
      { name: "group", type: "select" },
    ],
  };
  const [data, setData] = useState(() => {
    const storedData = localStorage.getItem(browserLocalStorageKey);
    return storedData ? JSON.parse(storedData) : defaultData;
  });

  const [filters, setFilters] = useState([]);
  const [shiftRules, setShiftRules] = useState([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem(browserLocalStorageKey);
    if (storedData) {
      setData(JSON.parse(storedData));
    }
  }, []);
  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(browserLocalStorageKey, JSON.stringify(data));
  }, [data]);

  const handleTableDataChange = (newData) => {
    setData(newData);
  };

  const handleFiltersReady = (newFilters) => {
    console.log("setting filters", newFilters);
    setFilters(newFilters);
  };

  const handleNewRule = (newRule) => {
    setShiftRules([...shiftRules, newRule]);
  };

  const formRuleSentence = (rule) => {
    return `When shift ${JSON.stringify(rule.when)} on ${
      rule.on
    }, Then shift ${JSON.stringify(rule.then)} should happen on day ${
      rule.daysAfter
    }`;
  };

  return (
    <>
      <h1>Shift playground</h1>
      <h2>Shift rules using Query Builder</h2>
      <NewShiftRule data={data} onRuleReady={handleNewRule} />
      <ul>
        {shiftRules.map((rule, i) => (
          <li key={i}>{formRuleSentence(rule)})</li>
        ))}
      </ul>

      <h2>Shifts filter and edit</h2>
      <QueryFilter data={data} onFiltersReady={handleFiltersReady} />
      <Table
        tableData={data}
        onTableDataChange={handleTableDataChange}
        filters={filters}
      />
    </>
  );
}

export default ShiftConfiguration;
