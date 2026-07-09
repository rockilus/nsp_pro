'use client';

import { Button } from '@/components/ui/button';

interface SuggestionChipsProps {
  title: string;
  hint: string;
  chips: string[];
  onSelect: (prompt: string) => void;
}

export function SuggestionChips({ title, hint, chips, onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-col gap-2">
        {chips.map((chip) => (
          <Button
            key={chip}
            variant="outline"
            className="h-auto justify-start py-2 text-left text-sm whitespace-normal"
            onClick={() => onSelect(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>
    </div>
  );
}
