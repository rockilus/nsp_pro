'use client';

import * as React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/app/i18n/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeSelectorProps {
  lng: string;
  variant?: 'standalone' | 'compact';
}

const MODES: { mode: ThemeMode; icon: typeof Sun; labelKey: string; testId: string }[] = [
  { mode: 'light', icon: Sun, labelKey: 'theme_light', testId: 'theme-selector-light' },
  { mode: 'dark', icon: Moon, labelKey: 'theme_dark', testId: 'theme-selector-dark' },
  { mode: 'system', icon: Monitor, labelKey: 'theme_auto', testId: 'theme-selector-auto' },
];

export default function ThemeSelector({ lng, variant = 'standalone' }: ThemeSelectorProps) {
  const { t } = useTranslation(lng, 'app-bar');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (theme as ThemeMode) || 'system';

  if (!mounted) {
    // Render a disabled placeholder to avoid hydration mismatch
    return (
      <div className="inline-flex rounded-md border border-input" data-testid="theme-selector">
        <Button variant="ghost" size={variant === 'compact' ? 'icon' : 'default'} disabled>
          <Sun className="size-[18px]" />
        </Button>
      </div>
    );
  }

  return (
    <div className="inline-flex rounded-md border border-input" data-testid="theme-selector">
      {MODES.map(({ mode, icon: Icon, labelKey, testId }) => {
        const isActive = currentTheme === mode;
        return (
          <Button
            key={mode}
            variant="ghost"
            size={variant === 'compact' ? 'icon' : 'default'}
            onClick={() => setTheme(mode)}
            data-testid={testId}
            aria-label={t(labelKey)}
            className={cn(
              'rounded-none first:rounded-l-md last:rounded-r-md',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-[18px]" />
            {variant === 'standalone' && <span className="ml-2">{t(labelKey)}</span>}
          </Button>
        );
      })}
    </div>
  );
}
