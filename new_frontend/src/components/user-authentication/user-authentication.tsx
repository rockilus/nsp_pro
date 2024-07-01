"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
// Components
import SignIn from "./sign-in";
import SignUp from "./sign-up";

export default function UserAuthentication() {
  const searchParams = useSearchParams();
  const show = searchParams.get("show")?.toString();

  return show === "signup" ? <SignUp /> : <SignIn />;
}
