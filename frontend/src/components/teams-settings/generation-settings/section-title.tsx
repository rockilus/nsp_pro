import React from 'react';
import { Separator } from '@/components/ui/separator';

type Props = {
  title: React.ReactNode;
  className?: string;
};

export default function SectionTitle({ title, className }: Props) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-3">
        <Separator />
      </div>
    </div>
  );
}
