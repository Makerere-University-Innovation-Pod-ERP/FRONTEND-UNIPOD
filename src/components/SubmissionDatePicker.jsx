import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function parseDate(value) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SubmissionDatePicker({
  id,
  label,
  value,
  min,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDate(value);
  const minimumDate = parseDate(min);

  return (
    <div className="submission-date-picker">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="submission-date-picker__trigger"
            aria-label={label}
            aria-haspopup="dialog"
          >
            <CalendarDays size={16} aria-hidden="true" />
            <span>{selectedDate
              ? new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }).format(selectedDate)
              : 'Choose a date'}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="submission-date-picker__content"
          align="start"
          sideOffset={6}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatDate(date));
              setOpen(false);
            }}
            disabled={minimumDate ? { before: minimumDate } : undefined}
            startMonth={minimumDate}
            defaultMonth={selectedDate ?? minimumDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
