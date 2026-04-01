import React, { useState } from "react";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Popover,
} from "@mui/material";
import {
  MoreVert as MoreVertIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import {
  ColumnDefinition,
  ColumnFilter,
  TableSort,
  SortDirection,
} from "../../types/filter";
import TextFilter from "./filters/TextFilter";
import SelectFilter from "./filters/SelectFilter";
import DateFilter from "./filters/DateFilter";

interface ColumnSortFilterMenuProps {
  column: ColumnDefinition;
  currentSort?: TableSort;
  currentFilter?: ColumnFilter;
  onSort: (sort: TableSort | null) => void;
  onFilter: (filter: ColumnFilter) => void;
}

export default function ColumnSortFilterMenu({
  column,
  currentSort,
  currentFilter,
  onSort,
  onFilter,
}: ColumnSortFilterMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(
    null,
  );

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSort = (direction: SortDirection) => {
    if (direction) {
      onSort({
        columnId: column.id,
        direction,
        label: column.label,
      });
    } else {
      onSort(null);
    }
    handleMenuClose();
  };

  const handleFilterOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
    handleMenuClose();
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const renderFilterComponent = () => {
    switch (column.type) {
      case "text":
        return (
          <TextFilter
            onApply={onFilter}
            onClose={handleFilterClose}
            columnId={column.id}
            label={column.label}
            currentValue={currentFilter?.value}
          />
        );

      case "select":
        return (
          <SelectFilter
            onApply={onFilter}
            onClose={handleFilterClose}
            columnId={column.id}
            label={column.label}
            options={column.getOptions?.() || []}
            currentValue={currentFilter?.value}
          />
        );

      case "boolean":
        return (
          <SelectFilter
            onApply={onFilter}
            onClose={handleFilterClose}
            columnId={column.id}
            label={column.label}
            options={column.getOptions?.() || []}
            currentValue={currentFilter?.value}
          />
        );

      case "date":
        return (
          <DateFilter
            onApply={onFilter}
            onClose={handleFilterClose}
            columnId={column.id}
            label={column.label}
            currentValue={currentFilter?.value}
          />
        );

      default:
        return null;
    }
  };

  const isCurrentlySorted = currentSort?.columnId === column.id;
  const sortDirection = isCurrentlySorted ? currentSort.direction : null;

  return (
    <>
      <IconButton
        component="span"
        size="small"
        onClick={handleMenuOpen}
        sx={{
          opacity: 0.7,
          "&:hover": { opacity: 1 },
        }}
        data-testid={`column-menu-${column.id}`}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 180 } }}
      >
        <MenuItem
          onClick={() => handleSort("asc")}
          data-testid={`sort-asc-${column.id}`}
        >
          <ListItemIcon>
            <ArrowUpwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sort Ascending</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => handleSort("desc")}
          data-testid={`sort-desc-${column.id}`}
        >
          <ListItemIcon>
            <ArrowDownwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Sort Descending</ListItemText>
        </MenuItem>

        {sortDirection && (
          <MenuItem
            onClick={() => handleSort(null)}
            data-testid={`remove-sort-${column.id}`}
          >
            <ListItemText>Remove Sort</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem
          onClick={handleFilterOpen}
          data-testid={`filter-menu-${column.id}`}
        >
          <ListItemIcon>
            <FilterListIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Filter</ListItemText>
        </MenuItem>
      </Menu>

      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        {renderFilterComponent()}
      </Popover>
    </>
  );
}
