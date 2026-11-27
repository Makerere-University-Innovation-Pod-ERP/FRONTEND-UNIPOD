import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyStoredTheme, setTheme } from './theme';

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.classList.remove('dark');
  vi.restoreAllMocks();
});

describe('theme', () => {
  it('keeps the dark utility class in sync with the stored theme', () => {
    setTheme('dark');

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveClass('dark');

    setTheme('light');

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('applies the system dark preference when there is no stored theme', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));

    applyStoredTheme();

    expect(document.documentElement).toHaveClass('dark');
  });
});
