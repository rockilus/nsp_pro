'use client';

import React from 'react';
import { useAuth } from '../../contexts/auth-context';
import { env } from '../../config/env';

export function AuthDebugComponent() {
  const auth = useAuth();

  // Only show in development or when explicitly enabled
  if (!env.isDevelopment) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px',
        fontFamily: 'monospace',
      }}
    >
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Auth Debug</h4>
      <div>Authenticated: {auth.isAuthenticated ? '✅' : '❌'}</div>
      <div>Loading: {auth.loading ? '🔄' : '✅'}</div>
      <div>User: {auth.user ? '✅' : '❌'}</div>
      <div>User ID: {auth.user?.id || 'N/A'}</div>
    </div>
  );
}
