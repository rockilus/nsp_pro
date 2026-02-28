import { languages } from "../../i18n/settings";
// MUI
import CssBaseline from "@mui/material/CssBaseline";
// Components
import AdminLayout from "@/components/admin/admin-layout";
import ProtectedRoute from "@/components/auth/protected-route";
// Context
import { UserProvider } from "@/context/UserProvider";
import React from "react";

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
}) {
  const { lng } = await params;

  return (
    <ProtectedRoute requireAuth={true}>
      <UserProvider>
        <CssBaseline />
        <AdminLayout params={{ lng }}>{children}</AdminLayout>
      </UserProvider>
    </ProtectedRoute>
  );
}
