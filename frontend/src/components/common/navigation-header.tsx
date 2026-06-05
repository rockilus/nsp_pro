'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Styles
import './navigation-styles.css';

interface NavigationHeaderProps {
  title: string;
  onBack?: () => void;
  showBackButton: boolean;
}

export default function NavigationHeader({ title, onBack, showBackButton }: NavigationHeaderProps) {
  return (
    <div className="navigation-header">
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          aria-label="back"
          className="mr-1 size-8"
        >
          <ArrowLeft className="size-5" />
        </Button>
      )}
      <span className="navigation-header-title">{title}</span>
    </div>
  );
}
