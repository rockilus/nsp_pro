"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
// Components
import SignIn from "./signIn";
import SignUp from "./signUp";

export default function UserAuthentication() {
  const searchParams = useSearchParams();
  const show = searchParams.get("show")?.toString();

  return show === "signup" ? <SignUp /> : <SignIn />;
}
