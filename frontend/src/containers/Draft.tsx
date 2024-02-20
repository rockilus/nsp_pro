import React, { useEffect } from "react";
// Components
import Dashboard from "../components/Dashboard/Dashboard";
// Stores
import { useUserStore } from "../stores/userStore";

export default function Draft() {
  const user = useUserStore((state) => state.user);
  // const fetchUser = useUserStore((state) => state.fetchUser);

  // useEffect(() => {
  //   fetchUser();
  // }, [fetchUser]);

  return <Dashboard />;
}
