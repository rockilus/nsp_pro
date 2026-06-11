'use client';

import React from 'react';
import { useTranslation } from '@/app/i18n/client';
// Types
import { UserT } from '@/types/user';
// shadcn
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface AdminUsersTableProps {
  lng: string;
  users: UserT[];
  /**
   * Called when the "Access account" button is clicked.
   */
  onAccessAccount?: (userId: string) => void;
}

export default function AdminUsersTable({ lng, users, onAccessAccount }: AdminUsersTableProps) {
  const { t } = useTranslation(lng, 'admin-users');

  if (users.length === 0) {
    return (
      <p data-testid="admin-no-users-message" className="mt-2 text-sm text-muted-foreground">
        {t('noUsersFound')}
      </p>
    );
  }

  return (
    <div
      data-testid="admin-users-table"
      className="overflow-hidden rounded-lg border border-border"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">{t('firstName')}</TableHead>
            <TableHead className="font-semibold">{t('lastName')}</TableHead>
            <TableHead className="font-semibold">{t('email')}</TableHead>
            <TableHead className="text-right font-semibold">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
              <TableCell>{user.firstName}</TableCell>
              <TableCell>{user.lastName}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell className="text-right">
                <Button
                  data-testid={`access-account-btn-${user.id}`}
                  variant="outline"
                  size="sm"
                  disabled={!onAccessAccount}
                  onClick={() => onAccessAccount?.(user.id)}
                >
                  {t('accessAccount')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
