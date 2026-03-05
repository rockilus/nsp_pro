"use client";

import React from "react";
import AdminUsersTab from "@/components/admin/admin-users-tab";

export default function AdminUsersPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = React.use(params as Promise<{ lng: string }>);

  return <AdminUsersTab lng={lng} />;
}
