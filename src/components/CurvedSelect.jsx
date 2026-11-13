import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * CurvedSelect — A custom, accessible dropdown menu with smooth curved edges (border-radius: 14px - 9999px)
 * that completely replaces native OS Win32 square dropdown menus while retaining 100% standard select
 * form/testing accessibility.
 *
 * Props:
 * - value: string | number
 * - onChange: (valueOrEvent) => void
 * - options: Array<string | { value: string | number, label: string, badge?: string, disabled?: boolean }>
 * - placeholder?: string
 * - ariaLabel?: string
 * - id?: string
 * - name?: string
 * - required?: boolean
 * - disabled?: boolean
 * - variant?: 'pill' | 'field' (pill: border-radius: 9999px for filters; field: border-radius: 14px for forms)
 * - className?: string
 */
export function CurvedSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  ariaLabel,
  id,
  name,
  required = false,
  disabled = false,
  variant = 'field',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options into { value, label, badge, disabled }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: String(opt), label: String(opt), badge: null, disabled: false };
    }
    return {
      value: String(opt.value ?? ''),
      label: opt.label ?? String(opt.value ?? ''),
      badge: opt.badge ?? null,
      disabled: Boolean(opt.disabled),
    };
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === String(value ?? ''));

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (option) => {
    if (option.disabled || disabled) return;
    setIsOpen(false);

    if (onChange) {
      const syntheticEvent = {
        target: { id, name: name || id, value: option.value },
        currentTarget: { id, name: name || id, value: option.value },
      };
      onChange(syntheticEvent);
    }
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen((prev) => !prev);
    }
  };

  const handleOptionKeyDown = (event, option) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(option);
    }
  };

  const isPill = variant === 'pill';

  return (
    <div
      ref={containerRef}
      className={`curved-select-container ${isPill ? 'variant-pill' : 'variant-field'} ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
    >
      {/* Hidden native select for standard HTML form submission, keyboard accessibility & test compatibility */}
      <select
        id={id}
        name={name || id}
        value={value ?? ''}
        required={required}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        className="curved-select-native"
        onChange={(e) => {
          if (onChange) onChange(e);
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {normalizedOptions.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Visual custom curved dropdown button */}
      <button
        type="button"
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className="curved-select-trigger"
      >
        <span className={`curved-select-label ${!selectedOption ? 'is-placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`curved-select-chevron ${isOpen ? 'rotate-chevron' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Custom curved dropdown menu options list */}
      {isOpen && (
        <div className="curved-select-popup" role="listbox" tabIndex={-1}>
          {normalizedOptions.map((option) => {
            const isSelected = option.value === String(value ?? '');
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                tabIndex={option.disabled ? -1 : 0}
                className={`curved-select-option ${isSelected ? 'is-selected' : ''} ${option.disabled ? 'is-disabled' : ''}`}
                onClick={() => handleSelect(option)}
                onKeyDown={(e) => handleOptionKeyDown(e, option)}
              >
                <span className="curved-select-option-text">{option.label}</span>
                {option.badge && <span className="curved-select-badge">{option.badge}</span>}
                {isSelected && (
                  <Check size={14} className="curved-select-check" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
