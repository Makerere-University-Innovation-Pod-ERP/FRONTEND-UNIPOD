const THEME_KEY = 'unipod-theme';

function isTheme(value) {
  return value === 'light' || value === 'dark';
}

export function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function prefersDarkSystemTheme() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}

/** Applies a previously-saved theme preference before the app renders, to avoid a flash. */
export function applyStoredTheme() {
  const stored = getStoredTheme();
  if (stored) document.documentElement.setAttribute('data-theme', stored);
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Theme preference just won't persist across sessions.
  }
}
