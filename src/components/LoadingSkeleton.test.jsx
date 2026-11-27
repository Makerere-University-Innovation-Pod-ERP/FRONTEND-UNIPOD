import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('provides an accessible status and table-shaped placeholders', () => {
    const { container } = render(
      <LoadingSkeleton label="Loading equipment list…" variant="table" />,
    );

    expect(screen.getByRole('status', { name: 'Loading equipment list…' }))
      .toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.loading-skeleton__row')).toHaveLength(4);
  });

  it('renders a week-shaped calendar skeleton', () => {
    const { container } = render(
      <LoadingSkeleton label="Loading calendar…" variant="calendar" />,
    );

    expect(screen.getByRole('status', { name: 'Loading calendar…' })).toBeInTheDocument();
    expect(container.querySelectorAll('.tx-day-card')).toHaveLength(7);
  });

  it('renders the finance metrics and two-panel invoice layout', () => {
    const { container } = render(
      <LoadingSkeleton label="Loading invoices…" variant="invoices" />,
    );

    expect(screen.getByRole('status', { name: 'Loading invoices…' })).toBeInTheDocument();
    expect(container.querySelectorAll('.invoices-overview-grid .loading-skeleton__metric'))
      .toHaveLength(5);
    expect(container.querySelectorAll('.invoices-bottom-grid > .loading-skeleton__section'))
      .toHaveLength(2);
  });
});
