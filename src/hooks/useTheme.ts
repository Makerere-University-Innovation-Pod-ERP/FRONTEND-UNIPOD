import { useCallback, useState } from 'react';
import { getStoredTheme, prefersDarkSystemTheme, setTheme as persistTheme, type Theme } from '@/lib/theme';

function resolveInitialTheme(): Theme {
  return getStoredTheme() ?? (prefersDarkSystemTheme() ? 'dark' : 'light');
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
