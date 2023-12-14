import React, { useEffect, useMemo } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import PermissionTable from "./PermissionTable";
import RoleTable from "./RoleTable";
import { useRoleStore } from "../../stores/roleStore";
import { usePermissionStore } from "../../stores/permissionStore";

export default function Admin() {
  const roles = useRoleStore((state) => state.roles);
  const fetchRoles = useRoleStore((state) => state.fetchRoles);

  const permissions = usePermissionStore((state) => state.permissions);
  const fetchPermissions = usePermissionStore(
    (state) => state.fetchPermissions
  );

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return (
    <Box style={{ width: "100%" }}>
      <Typography variant="h4" align="left">
        Admin
      </Typography>
      <Typography variant="h6" align="left">
        Permissions
      </Typography>
      <PermissionTable permissions={permissions} />
      <Typography variant="h6" align="left">
        Roles
      </Typography>
      <RoleTable roles={roles} permissions={permissions} />
    </Box>
  );
}
