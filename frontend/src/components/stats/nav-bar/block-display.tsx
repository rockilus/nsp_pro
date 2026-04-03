// Constants
import { ConstraintDefaultColors } from '../../../constants/constants';
// Styles
import './block-display.css';

export const blockDislayValue = (value: string | number, disabled: boolean) => {
  return <div className={`field-value ${disabled ? 'disabled' : ''}`}>{value}</div>;
};
