'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  error?: string;
  labelRight?: ReactNode;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, icon, error, labelRight, id, className, ...inputProps }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    const errorId = `${fieldId}-error`;

    return (
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <label htmlFor={fieldId} style={{ fontSize: 15, fontWeight: 500, color: '#f3f4f6' }}>
            {label}
          </label>
          {labelRight}
        </div>

        <div
          className="flex items-center auth-field-wrapper"
          style={{
            height: 56,
            gap: 14,
            padding: '0 16px',
            background: 'rgba(4, 6, 10, 0.65)',
            border: `1px solid ${error ? 'rgba(248, 113, 113, 0.72)' : 'rgba(203, 213, 225, 0.32)'}`,
            borderRadius: 10,
          }}
        >
          <span style={{ display: 'flex', color: 'rgba(226, 232, 240, 0.55)', flexShrink: 0 }} aria-hidden="true">
            {icon}
          </span>
          <input
            ref={ref}
            id={fieldId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className={`auth-field-input ${className ?? ''}`}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 16,
              color: '#f4f4f5',
              height: '100%',
            }}
            {...inputProps}
          />
        </div>

        {error && (
          <p id={errorId} role="alert" style={{ fontSize: 13, color: '#f87171', marginTop: 7 }}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export default FormField;
