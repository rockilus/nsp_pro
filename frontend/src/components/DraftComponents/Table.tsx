import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  Drawer,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { log } from "console";

function applyFilters(data, filters, origin) {
  console.log(`[${origin}] applying filters`, filters);

  if (!filters || filters.length === 0) {
    // No filters applied, return all rows
    return data;
  }

  const rows = data.rows.filter((row) => {
    // Check if the row satisfies all the filters
    return filters.every((filter) => {
      const { column, operator, value } = filter;
      const rowValue = row[column];

      // Apply the corresponding operator for each filter
      switch (operator) {
        case "equal":
          return rowValue === value;
        case "not equal":
          return rowValue !== value;
        case "less than":
          return rowValue < value;
        case "greater than":
          return rowValue > value;
        default:
          return true;
      }
    });
  });
  console.log(`[${origin}] applied filters, new rows`, rows);

  return {
    ...data,
    rows: rows,
  };
}

function DataTable({ tableData, onTableDataChange, filters }) {
  const [data, setData] = useState(tableData);
  const [filteredData, setFilteredData] = useState(() => {
    const newData = applyFilters(tableData, filters, "DataTableConstr");
    console.log("newData", newData);
    return {
      ...newData,
    };
  });

  useEffect(() => {
    setFilteredData(applyFilters(data, filters, "useEffect"));
    onTableDataChange(data);
  }, [data, filters]);

  const [newRow, setNewRow] = useState({});
  const [newColumn, setNewColumn] = useState({ name: "", type: "text" });
  const [editing, setEditing] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false); // NEW state variable for controlling drawer visibility

  const handleInputChange = (e, columnName) => {
    setNewRow((prev) => ({ ...prev, [columnName]: e.target.value }));
  };

  const handleCellChange = (e, rowIndex, columnName) => {
    const updatedRows = [...data.rows];
    updatedRows[rowIndex][columnName] = e.target.value;
    setData((prevData) => ({ ...prevData, rows: updatedRows }));
  };

  const handleAddRow = () => {
    setData((prevData) => ({ ...prevData, rows: [...prevData.rows, newRow] }));
    setNewRow({});
  };

  const handleNewColumnChange = (e) => {
    setNewColumn((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddColumn = () => {
    setData((prevData) => {
      const updatedRows = prevData.rows.map((row) => ({
        ...row,
        [newColumn.name]: "", // initialize the new column's property for each row
      }));

      return {
        ...prevData,
        rows: updatedRows,
        columns: [...prevData.columns, newColumn],
      };
    });

    setNewColumn({ name: "", type: "text" });
  };

  const handleDeleteColumn = (columnName) => {
    setData((prevData) => {
      const updatedColumns = prevData.columns.filter(
        (column) => column.name !== columnName
      );
      const updatedRows = prevData.rows.map((row) => {
        const updatedRow = { ...row };
        delete updatedRow[columnName];
        return updatedRow;
      });

      return {
        ...prevData,
        columns: updatedColumns,
        rows: updatedRows,
      };
    });
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleDeleteRow = (rowIndex) => {
    setData((prevData) => {
      const updatedRows = prevData.rows.filter(
        (row, index) => index !== rowIndex
      );

      return {
        ...prevData,
        rows: updatedRows,
      };
    });
  };

  console.log("[before rendering] filteredData rows", filteredData.rows);
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {filteredData.columns.map((column, index) => (
              <TableCell key={index}>
                {index === 0 ? (
                  <span>{column.label}</span>
                ) : (
                  <div>
                    {column.label}
                    <IconButton onClick={() => handleDeleteColumn(column.name)}>
                      <DeleteIcon />
                    </IconButton>
                  </div>
                )}
              </TableCell>
            ))}
            <TableCell>
              <Button onClick={toggleDrawer}>
                <AddIcon />
              </Button>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredData.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {filteredData.columns.map((column, colIndex) => (
                <TableCell key={colIndex}>
                  {editing[rowIndex] === column.name ? (
                    <TextField
                      fullWidth
                      type={column.type === "number" ? "number" : "text"}
                      name={column.name}
                      value={row[column.name]}
                      onChange={(e) =>
                        handleCellChange(e, rowIndex, column.name)
                      }
                      onBlur={() => setEditing({})}
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => setEditing({ [rowIndex]: column.name })}
                      style={{ display: "inline-block", width: "100%" }}
                    >
                      {row[column.name] || "\u00A0"}
                    </span>
                  )}
                </TableCell>
              ))}
              <TableCell>
                <Button onClick={() => handleDeleteRow(rowIndex)}>
                  <DeleteIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            {filteredData.columns.map((column, index) => (
              <TableCell key={index}>
                <TextField
                  fullWidth
                  type={column.type === "number" ? "number" : "text"}
                  name={column.name}
                  value={newRow[column.name] || ""}
                  onChange={(e) => handleInputChange(e, column.name)}
                  label={`${column.label}`}
                />
              </TableCell>
            ))}
            <TableCell>
              <Button onClick={handleAddRow}>
                <AddIcon />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer}>
        <div style={{ padding: "16px" }}>
          <TextField
            value={newColumn.name}
            onChange={handleNewColumnChange}
            name="name"
            label="New Column"
          />
          <Select
            value={newColumn.type}
            onChange={handleNewColumnChange}
            name="type"
          >
            <MenuItem value={"text"}>Text</MenuItem>
            <MenuItem value={"select"}>Select</MenuItem>
            <MenuItem value={"number"}>Number</MenuItem>
          </Select>
          <Button onClick={handleAddColumn}>Add Column</Button>
        </div>
      </Drawer>
    </TableContainer>
  );
}

export default DataTable;
