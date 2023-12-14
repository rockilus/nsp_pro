import React, { useState, useEffect } from "react";
// Components
import SignIn from "../components/Login/SignIn";
import SignUp from "../components/Login/SignUp";
import Dashboard from "../components/Dashboard/Dashboard";
// Stores
import { useUserStore } from "../stores/userStore";

export default function Draft() {
  const [showSignUp, setShowSignUp] = useState(false);

  const user = useUserStore((state) => state.user);
  const fetchUser = useUserStore((state) => state.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    // {user && user.role === "admin" && (}
    user ? (
      <Dashboard />
    ) : showSignUp ? (
      <SignUp setShowSignUp={setShowSignUp} />
    ) : (
      <SignIn setShowSignUp={setShowSignUp} />
    )
  );
}
