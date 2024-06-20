import { useEffect, useState } from "react";
import { redirectToAuth } from "supertokens-auth-react";
import SuperTokens from "supertokens-auth-react/ui";
import { EmailPasswordPreBuiltUI } from "supertokens-auth-react/recipe/emailpassword/prebuiltui";
import { redirect } from "next/navigation";
// Components
import UserAuthentication from "@/components/userAuthentication/userAuthentication";
import { getSSRSessionHelper } from "@/components/home";
import Auth from "@/components/userAuthentication/auth";

export default async function AuthPage() {
  const { accessTokenPayload, hasToken, error } = await getSSRSessionHelper();
  console.log("accessTokenPayload", accessTokenPayload);
  console.log("hasToken", hasToken);
  console.log("error", error);

  if (hasToken) {
    return redirect("/");
  }
  return <Auth />;
  // // if the user visits a page that is not handled by us (like /auth/random), then we redirect them back to the auth page.
  // const [loaded, setLoaded] = useState(false);
  // useEffect(() => {
  //   if (SuperTokens.canHandleRoute([EmailPasswordPreBuiltUI]) === false) {
  //     redirectToAuth({ redirectBack: false });
  //   } else {
  //     setLoaded(true);
  //   }
  // }, []);

  // if (loaded) {
  //   return SuperTokens.getRoutingComponent([EmailPasswordPreBuiltUI]);
  //   // return <UserAuthentication />;
  // }

  // return null;
}
