import React, { useEffect, useState } from 'react';
import ConstraintBuilder from './ConstraintBuilder';


function ConstraintPanel() {
  const browserLocalStorageKey = 'localStorage_constraintPanel';
  const defaultData: Config = {
    rows: [
      { name: 'Garde Plo', group: 'garde', slot: 'night' },
      { name: 'Garde Mat', group: 'garde', slot: 'night' },
      { name: 'Consult 1', group: 'garde', slot: 'morning' },
      { name: 'Consult 2', group: 'garde', slot: 'morning' },
      { name: 'Off', group: 'off', slot: 'day' },
      { name: 'RTT', group: 'off', slot: 'day' },
      { name: 'RTT', group: 'off', slot: 'day' },
    ],
    columns: [
      { name: 'name', type: 'text' },
      { name: 'group', type: 'select' },
      { name: 'slot', type: 'select' },
    ],
  };
  const [data, setData] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem(browserLocalStorageKey);
      return storedData ? JSON.parse(storedData) : defaultData;
    }
    return defaultData;
  });

  const [constraints, setConstraints] = useState<Constraint[]>([])

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

  const handleNewConstraint = (newConstraint: Constraint) => {
    setConstraints([...constraints, newConstraint])
  }

  const formDayFilterSentence = (dayFilter: DayFilter) => {
    const dayText = dayFilter.day === 'any' ? 'Any day' : `Day N+${dayFilter.day}`;
    const filterTexts = dayFilter.filters.map(filter => `${filter.column} ${filter.operator} ${filter.value}`).join(' and ');
    return `${dayText}: ${filterTexts}`;
  };
  
  const formConstraintSentence = (constraint: Constraint) => {
    const whenPart = constraint.when.map(formDayFilterSentence).join(' and ');
    const thenPart = constraint.then.map(formDayFilterSentence).join(' and ');
    return `${constraint.name}: When ${whenPart}, Then ${thenPart}`;
  }
  

  return (
    <>
      <h1>Constraint playground</h1>
      <h2>Constraint constraints using Query Builder</h2>
      <ConstraintBuilder data={data} onConstraintReady={handleNewConstraint} />
      <ul>
        {constraints.map((constraint, i) => <li key={i}>{formConstraintSentence(constraint)})</li>)}
      </ul>

    </>
  )
}

export default ConstraintPanel;
