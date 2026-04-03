import React, { ReactElement } from 'react';
// MUI
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
// Styles
import './user-profile-row.css';

export default function UserProfileRow({
  label,
  value,
  valueEditing,
  editing,
  editButton,
  handleEditConfirm,
  handleEditCancel,
}: {
  label: string;
  value: ReactElement;
  valueEditing: ReactElement;
  editing: boolean;
  editButton: ReactElement;
  handleEditConfirm: () => void;
  handleEditCancel: () => void;
}) {
  return (
    <div className="user-profile-row">
      <div className="row-label-container">
        <span className="row-label">{label}</span>
      </div>
      {editing ? (
        <div className="row-value-container">
          <div className="row-value">{valueEditing}</div>

          <div className="edit-buttons-container">
            <IconButton onClick={handleEditConfirm}>
              <CheckIcon />
            </IconButton>
            <IconButton onClick={handleEditCancel}>
              <CloseIcon />
            </IconButton>
          </div>
        </div>
      ) : (
        <div className="row-value-container">
          <div className="row-value">{value}</div>
          <div className="edit-buttons-container">{editButton}</div>
        </div>
      )}
    </div>
  );
}
