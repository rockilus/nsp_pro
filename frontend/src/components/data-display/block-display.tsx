// Constants
import { ConstraintDefaultColors } from '../../constants/constants';
// Styles
import './block-display.css';

export const blockDislayValue = (value: string | number) => {
  return (
    <div
      className="field-value"
      style={{
        display: 'inline-block',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: ConstraintDefaultColors.shade3,
        width: '100%',
      }}
    >
      {value}
    </div>
  );
};

export const blockDisplayPlaceholder = (
  placeholder: string | number,
  error: boolean,
  testId?: string,
) => {
  return (
    <div className={`placeholder-value ${error ? 'error' : ''}`} data-testid={testId}>
      {placeholder}
    </div>
  );
};

export const blockDisplayName = (name: string, error: boolean, testId?: string) => {
  return (
    <div data-testid={testId}>
      <hr className={`name-display-line ${error ? 'error' : ''}`} />
      <div
        className={`name-display-field-name ${error ? 'error' : ''}`}
        data-testid={error && testId ? `${testId}-error` : undefined}
      >
        {name.charAt(0).toUpperCase() + name.slice(1)}
      </div>
    </div>
  );
};

export const blockDisplayText = (text: string) => {
  return (
    <div
      className="field-value"
      style={{
        display: 'inline-block',
        color: ConstraintDefaultColors.shade3,
      }}
    >
      {text}
    </div>
  );
};
