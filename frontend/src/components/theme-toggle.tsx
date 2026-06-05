'use client';

import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'rockilus-theme';

function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  const el = document.documentElement;
  if (theme === 'dark') {
    el.classList.add('dark');
  } else {
    el.classList.remove('dark');
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => getStoredTheme());
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    applyTheme(theme);
    setMounted(true);
  }, [theme]);

  // Apply on mount in case stored theme differs from SSR default
  React.useEffect(() => {
    const current = getStoredTheme();
    if (current !== theme) {
      setTheme(current);
    } else {
      applyTheme(current);
      setMounted(true);
    }
  }, [theme]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled data-testid="theme-toggle">
        <Sun className="size-[18px]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="theme-toggle"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
